// A visitor's topic and the detail they need are separate. For example, giving,
// stopping and asking for confirmation can all involve the same donation page.
type Passage = { de: string; en: string; also?: string[] };
type Card = {
  id: string;
  title: string;
  titleEn: string;
  sourceUrl: string;
  requestUrl?: string;
  visitorAnswers?: Partial<Record<string, Passage>>;
};
type Detail = { topic: string; passage: string };
const fold = (text: string) => text.toLowerCase().normalize("NFKD")
  .replace(/\p{M}/gu, "").replace(/ß/g, "ss").replace(/[’']/g, "'");

export function offersPartnership(message: string) {
  const q = fold(message);
  const asset = /raum|raume|labor|gerat|material|rechenzeit|fachwissen|workshop|equipment|room|venue|space|microscop|mikroskop|lab\b|expertise|mentoring|compute time|sensor/.test(q);
  const giving = /\b(?:we|i|our (?:lab|company|school|team|university|institute|business))\b (?:could |can |would like to |want(?:s)? to |would be happy to |is willing to |is able to |have offered to )?(?:offer|lend|host|provide|make available|share our)\b/.test(q)
    || /\b(?:wir|ich|unser\w* (?:betrieb|institut|labor|schule|hochschule|unternehmen))\b[^.!?]{0,90}(?:anbieten|zur verfugung stellen|bereitstellen|verleihen|hatten .{0,60}frei\b)/.test(q)
    || /\bmake (?:our|my|an?) (?:lab(?:oratory)?|venue|space|rooms?|equipment) available\b/.test(q)
    || /(?:offer|lend|provide|share) our (?:equipment|space|lab|venue)|(?:unser\w*|einen?) (?:raum|labor|gerat\w*) .{0,35}zur verfugung/.test(q);
  // A request for somebody else to lend something is on the receiving side.
  const seeking = /(?:looking|hoping) (?:for|to find)|(?:need|seeking) (?:a |an )?(?:sponsor|partner|company)|jemanden.{0,24}(?:suchen|finden)|(?:wir|ich) such|uns .{0,20}(?:leihen|zur verfugung stell)|(?:lend|offer|provide) (?:us|me)\b|(?:borrow|ausborgen|kann man .* ausleihen)/.test(q);
  const sponsor = /(?:wir|unser\w*|we|our (?:company|business))\b.{0,85}(?:mochten.{0,35}sponsern|sponsern mochten|(?:like|want|offer) to sponsor\b|als sponsor|sponsoring anbieten)/.test(q);
  return !seeking && ((asset && giving) || sponsor);
}

function publicationDetail(message: string, previous?: string): Detail | undefined {
  const q = fold(message);
  const donation = /spende|\bdonat|(?:i|we) give (?:to|every month)|(?:meine|my) .{0,12}(?:dauerauftrag|monthly gift)|monthly (?:gift|giving)|(?:money|geld) .{0,24}(?:give|forju)/.test(q);
  const onDonations = previous === "spenden" || previous === "spenden-bestaetigung";
  const shortFollowUp = q.split(/\s+/).length <= 12;
  const refersBack = shortFollowUp && !/\b(?:gym|netflix|fitness|insurance|versicherung|mitgliedschaft|membership|loan|workshop)\b/.test(q);
  const stopping = /\b(?:stop|cancel|end|discontinue)\b|kundig|beend|abstell|stopp/.test(q);
  const givingRegularly = donation || /recurring (?:donation|gift)/.test(q);
  if ((givingRegularly || (onDonations && refersBack)) && stopping) {
    return {topic:"spenden", passage:q.includes("paypal") ? "paypal" : "stop"};
  }

  const moneyUse = /wohin|wofur|wozu|verwend|eingesetzt|bezahlt|finanziert|wo .*geld|where .{0,24}(?:go|spent)|how .{0,24}(?:used|spent)|what .{0,30}(?:support|pay for|used for|fund)\b/.test(q);
  const candidate = /fahrtkosten|wettbewerbsfahrt|competition (?:trip|travel)|travel (?:costs|to (?:a )?competition)|kleine.{0,8}forderbeitrage|small (?:grants|contributions)|(?:material|thesis|wettbewerb|competition|abschlussarbeit).{0,40}(?:erstatt|reimburse)|(?:erstatt|reimburse).{0,40}(?:material|thesis|wettbewerb|competition|abschlussarbeit)/.test(q);
  const seekingFunds = /(?:beantrag|bekomm|antrag|kostenerstatt|zuschuss|fordert ihr|konnen wir|ubernimmt|wer bezahlt)|\b(?:apply|reimburs\w*|qualify|eligible|can (?:we|i)|cover|need\w* money)\b/.test(q);
  if (candidate && (donation || /\b(?:class|school|project|thesis|competition|forju)\b|projekt|abschlussarbeit|diplomarbeit|wettbewerb|klasse/.test(q)) && seekingFunds && !/\b(?:tax|refund my donation)|spende zuruck/.test(q)) {
    return {topic:"finanzierung", passage:"campaign"};
  }
  if (donation && moneyUse) return {topic:"spenden", passage:"purpose"};

  const membership = /mitglied|beitreten|membership|become a member|join (?:the association|forju)/.test(q);
  const terms = /alter\b|altersgrenze|minderjahr|jahr(?:e|ig)|beitrag|gebuhr|kostet|min(?:imum)? age|how old|under \d|years? old|\bfee|dues|annual cost|how much/.test(q);
  if (terms && (membership || (previous === "mitglied" && refersBack))) return {topic:"mitglied", passage:"terms"};
  if (offersPartnership(message)) return {topic:"partnerpool", passage:"offer"};
  return undefined;
}

export function publicGuidance(message: string, previous: string | undefined, lastAnswer: string | undefined, en: boolean, catalog: Card[], readerUrl: (url: string) => string) {
  let detail = publicationDetail(message, previous);
  // “And PayPal?” follows a cancellation answer, but has another meaning after
  // a general donation question. Rebuild context only from a reviewed reply.
  const cancellation = catalog.find(c => c.id === "spenden")?.visitorAnswers?.stop;
  if (previous === "spenden" && cancellation && (lastAnswer === cancellation.en || lastAnswer === cancellation.de)
      && /^(?:(?:und|and|what about|was ist mit) )?(?:per |by |mit |with )?paypal[?!. ]*$/i.test(message)) {
    detail = {topic:"spenden", passage:"paypal"};
  }
  if (!detail) return null;
  const card = catalog.find(c => c.id === detail.topic);
  const passage = card?.visitorAnswers?.[detail.passage];
  if (!card || !passage) return null;
  const records = [card, ...(passage.also ?? []).map(id => catalog.find(c => c.id === id))];
  if (records.some(c => !c)) return null;
  const sources = records.flatMap(c => c ? [{title:en ? c.titleEn : c.title, url:readerUrl(c.sourceUrl)}] : []);
  if (card.requestUrl) sources.push({title:en ? "Open the enquiry form" : "Anfrageformular öffnen", url:readerUrl(card.requestUrl)});
  return {mode:"library", topic:card.id, answer:passage[en ? "en" : "de"], sources};
}
