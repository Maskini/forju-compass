import { de, en as english } from "chrono-node";
import placeNames from "../knowledge/language/austrian-places.json" with { type: "json" };
import type { ChatMessage } from "./chat";

type Card = { id: string; title: string; titleEn: string; sourceUrl: string; requestUrl?: string; content:string; booking?:{de:string;en:string}; pricing?:{de:string;en:string}; coverage?:{places:string[];de:string;en:string} };
type Topic = "ressourcen" | "workshops" | "finanzierung" | "science-beratung" | "connections" | "spenden-bestaetigung";
const subjectTerms: [Topic, RegExp][] = [
  ["connections", /introductions?|vorstellung bei|kontaktvermittlung/i],
  ["spenden-bestaetigung", /donation (?:receipt|confirmation)|spendenbestätigung|spendenquittung/i],
  ["ressourcen", /sensor|messgerät|messger[aä]t|ausleih|messinstrument|borrow|equipment|microscope|mikroskop|thermometer|gerät.*leihen/i],
  ["workshops", /workshops?|schulseminar/i],
  ["finanzierung", /finanzier|förderpartner|funding|fundrais/i],
  ["science-beratung", /beratung|research idea|projektidee|project idea/i],
];
const askForDraft = /(?:schreib|formulier|verfass|entw[iu]rf|vorbereit|draft|compose|prepare|write|wording|vorlage|text für).{0,65}(?:e[ -]?mail|anfrage|nachricht|message|enquiry|inquiry)|(?:e[ -]?mail|anfrage|nachricht|message|enquiry|inquiry).{0,45}(?:formulier|schreib|entwerf|vorbereit|verfass|draft|template)|(?:what should i write|was (?:soll|kann) ich schreiben)/i;
const chooseSubject = [
  "Worum soll es in deiner Anfrage gehen: um Geräte, einen Schulworkshop, Finanzierung oder eine Projektidee?",
  "What would you like to ask ForJu about: equipment, a school workshop, funding or a project idea?",
];
const revisionOffer = ["Soll ich eine E-Mail mit dieser Änderung formulieren?", "Would you like an email draft with that change?"];
const draftLabel = ["E-Mail formulieren","Draft an email"];
function topicOf(message:string) {
  return subjectTerms.find(([,pattern]) => pattern.test(message))?.[0];
}
function placeKey(text:string) {
  return text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/ß/g,"ss");
}
const places = new Map(placeNames.map(name => [placeKey(name),name]));
for (const alias of ["Klagenfurt","Krems","St. Pölten","Styria","Tyrol","Carinthia","Upper Austria","Lower Austria"]) {
  places.set(placeKey(alias),alias);
}
function namedPlace(text:string) {
  // A preposition prevents ordinary words that are also town names (e.g. Hard)
  // from becoming locations. Prefer a full name such as Wiener Neustadt.
  const tokens = text.match(/[\p{L}\p{M}.-]+/gu) ?? [];
  for (let i=0; i<tokens.length; i++) {
    if (i!==0 && !/^(in|aus|nach|bei|um|von|from|near|to|around|outside|about|mit|and|und)$/i.test(tokens[i-1])) continue;
    for (let n=Math.min(6,tokens.length-i); n>0; n--) {
      const key=placeKey(tokens.slice(i,i+n).join(" ").replace(/\.$/,""));
      const name=places.get(key);
      if (name && (i>0 || tokens.length===n)) return name;
    }
  }
}
const visitQuestion = /geht (?:das|es).{0,25}(?:bei uns|auch)|bei uns.{0,25}(?:auch|möglich|stattfinden)|kommt ihr|ihr kommt|(?:auch|workshops?) (?:in|für schulen in)|außerhalb|ausserhalb|outside|do you (?:also )?(?:come|visit|travel|offer)|can (?:you|we).{0,35}(?:visit|come to|have a workshop)|(?:available|possible|workshops?) (?:in|for schools in)|what about|wie (?:ist|wäre) (?:es|das) (?:in|mit)/i;
function timing(messages:string[], en:boolean) {
  // German casual parsing misses standalone month names such as "im März".
  const months = /\b(?:Januar|Jänner|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?:\s+20\d{2})?\b/giu;
  for (const message of messages.toReversed()) {
    if (/no date yet|date (?:is )?(?:unknown|undecided)|noch kein(?:en)? termin|termin (?:ist )?(?:offen|unklar)/i.test(message)) break;
    const hits=(en?english:de).parse(message).map(({text,index})=>({text,index}));
    if (!en) for (const m of message.matchAll(months)) {
      if (!hits.some(h=>h.index<=m.index && h.index+h.text.length>=m.index+m[0].length)) hits.push({text:m[0],index:m.index});
    }
    for (const hit of hits.sort((a,b)=>b.index-a.index)) {
      const before=message.slice(0,hit.index), after=message.slice(hit.index+hit.text.length);
      if (/^may$/i.test(hit.text) && /^\s+(?:i|we|you)\b/i.test(after)) continue;
      if (!/(?:not|nicht|statt|instead of)(?:\s+(?:in|im|am|on))?\s*$/i.test(before)) return hit.text;
    }
    if (hits.length || /date.{0,18}(?:unknown|undecided)|termin.{0,18}(?:offen|unklar)/i.test(message)) break;
  }
}
const measurements: [RegExp,string,string][] = [
  [/luftqualität|luftqualitaet|luftgüte|air quality/i,"Luftqualität","air quality"],
  [/co[₂2]|kohlenstoffdioxid|carbon dioxide/i,"CO₂","CO₂"],
  [/temperatur/i,"Temperatur","temperature"], [/feuchtigkeit|humidity/i,"Luftfeuchtigkeit","humidity"],
  [/wasserqualität|water quality/i,"Wasserqualität","water quality"], [/lärm|noise/i,"Lärm","noise"],
];
const equipment: [RegExp,string,string][] = [
  [/sensor/i,"einen Sensor","a sensor"], [/mikroskop|microscope/i,"ein Mikroskop","a microscope"],
  [/thermometer/i,"ein Thermometer","a thermometer"], [/laborraum|lab space/i,"einen Laborraum","lab space"],
];
type Detail = {raw:string; text:string};
function term(details:Detail[], terms:[RegExp,string,string][],en:boolean) {
  for (const {raw,text} of details.toReversed()) {
    const hit=terms.find(([pattern])=>pattern.test(text));
    if (hit) return hit[en?2:1];
    // An unknown replacement must never resurrect an explicitly rejected detail.
    if (raw!==text && terms.some(([pattern])=>pattern.test(raw))) return;
  }
}
export function visitorEnquiry(
  raw:string, en:boolean, history:ChatMessage[], hint:string|undefined, records:Card[], readerUrl:(url:string)=>string, catalogTopic:(text:string)=>string|null, affirmed:(text:string)=>string
) {
  const message=affirmed(raw);
  const corrected=raw!==message;
  const lang=en?1:0;
  const resolveTopic = (text:string) => catalogTopic(affirmed(text)) ?? topicOf(affirmed(text));
  const current=resolveTopic(message);
  const prior=hint?.startsWith("workshop-")?"workshops":hint;
  const asks=askForDraft.test(message) && !/(?:don.t|do not|keine?|nicht)\s+(?:write|draft|e-?mail|anfrage|schreiben)/i.test(message);
  const answeringPrompt=chooseSubject.includes(history.at(-1)?.content ?? "");
  const topic=current ?? prior ?? resolveTopic(history.filter(t=>t.role==="user").at(-1)?.content ?? "");
  const card=records.find(r=>r.id===topic);
  const lastAnswer=history.at(-1)?.content ?? "";
  const revising=/^(?:Hello ForJu team,|Hallo ForJu-Team,)/.test(lastAnswer)
    && (!current || current===prior) && !message.includes("?")
    && (corrected || /^(?:actually|correction|make that|change (?:it|the date)|korrektur|doch|eigentlich|ändere)\b/i.test(message));
  const offeredDraft = revisionOffer.some(q=>lastAnswer.endsWith(q));
  const yes = /^(?:ja(?: bitte| gern[e]?)?|yes(?: please)?|please do|gern[e]?|mach das|sure|ok(?:ay)?)[\s.!]*$/i.test(message.replace(/,\s*/g," "));
  if (offeredDraft && /^(?:no|nein)(?:[, ]+(?:thanks|thank you|danke))?[.! ]*$/i.test(message)) {
    return {mode:"conversation",topic,answer:en?"Okay. What else would you like to know?":"Alles klar. Was möchtest du noch wissen?",sources:[]};
  }
  const wantDraft=asks || answeringPrompt || revising || (offeredDraft && yes);
  if (!wantDraft && corrected && prior===topic && topic==="ressourcen" && !message.includes("?")) {
    const recognized=[...equipment,...measurements].some(([pattern])=>pattern.test(message));
    if (recognized) return {mode:"conversation",topic,answer:(en?"Got it: ":"Verstanden: ")+message.replace(/[.!]+$/,"")+". "+revisionOffer[lang],sources:[],suggestions:[draftLabel[lang]]};
  }
  if (!wantDraft && topic!=="workshops") return null;
  if (wantDraft && !subjectTerms.some(([id])=>id===topic)) {
    return {mode:"conversation",answer:chooseSubject[lang],sources:[],suggestions:en?["Equipment","School workshop","Funding","Project idea"]:["Messgeräte","Schulworkshop","Finanzierung","Projektidee"]};
  }
  if (!card) return null;
  const page={title:en?card.titleEn:card.title,url:readerUrl(card.sourceUrl)};
  // Carry only recognized details from user turns about this subject. The
  // assistant's text and unrelated conversations never become email content.
  const details:Detail[]=[];
  for (const turn of history.toReversed()) {
    if (turn.role!=="user") continue;
    const previousTopic=resolveTopic(turn.content);
    if (current && prior && current!==prior) break;
    if (previousTopic && previousTopic!==topic) break;
    // Only a relevant subject or an explicit logistical detail can fill a slot.
    if (previousTopic===topic || affirmed(turn.content)!==turn.content || visitQuestion.test(turn.content) ||
        /^(?:actually|correction|make that|instead|timing|our class|korrektur|doch|zeitraum|termin|unsere klasse)\b/i.test(turn.content)) {
      details.unshift({raw:turn.content,text:affirmed(turn.content)});
    }
  }
  details.push({raw,text:message});
  const messages=details.map(d=>d.text);
  const currentPlace=namedPlace(message);
  const mentionedPlace=messages.toReversed().find(m=>namedPlace(m));
  const place=mentionedPlace && !/(?:außerhalb|ausserhalb|outside)(?: of| von)? (?:Wien|Vienna)/i.test(mentionedPlace)
    ? namedPlace(mentionedPlace) : undefined;
  if (!wantDraft) {
    const asksWhere=/bei uns|zu uns|at our school|our area|come to|travel to|outside|außerhalb|ausserhalb/i.test(message);
    const askedAboutPlace=(visitQuestion.test(message) && (currentPlace || asksWhere))
      || (currentPlace && message.trim().split(/\s+/).length<=3);
    // A price-only follow-up can refer to a particular workshop without naming the school or town again.
    if (!askedAboutPlace && card.pricing && /^(?:(?:und|and) )?(?:was kostet (?:es|das)(?: (?:eigentlich|pro (?:kind|person)))?|wie teuer ist (?:es|das)|ist (?:es|das) (?:gratis|kostenlos)|(?:how much (?:is (?:it|that)|does (?:it|that) cost)|what does (?:it|that) cost)(?: per (?:student|pupil))?|is (?:it|that) free)[?!. ]*$/i.test(message)) {
      return {mode:"library",topic:hint && (hint==="workshops" || hint.startsWith("workshop-")) ? hint : card.id,answer:card.pricing[en?"en":"de"],sources:[page],suggestions:[draftLabel[lang]]};
    }
    if (!askedAboutPlace || !card.coverage) return null;
    const inArea=place && card.coverage.places.includes(place) && !/au[ßs]+erhalb|outside/i.test(message);
    const area=place && !inArea?place:undefined;
    const where=area?" in "+area:(en?" at your school":" an eurer Schule");
    const text=card.coverage[en?"en":"de"]+" ";
    const locationAnswer=inArea ? (en?"Ask the workshop contact to confirm a date for your class.":"Ob ein Termin für eure Klasse frei ist, klärt ihr mit dem Workshopkontakt.")
      : en?"A visit"+where+" needs confirmation. Ask the workshop contact whether the team can come to you.":"Ob ein Workshop"+where+" möglich ist, geht daraus nicht hervor. Frag beim Workshopteam nach, ob es zu euch kommen kann.";
    const asksAboutCost = /kost(?:et|en)|preis|gebühr|gratis|teuer|zahlen|bezahlen|\b(?:costs?|prices?|fees?|free|pay)\b|how much/i.test(message);
    const price = asksAboutCost ? card.pricing?.[en ? "en" : "de"] : undefined;
    const answer = price ? text + locationAnswer + " " + price : text + locationAnswer;
    return {mode:"library",topic:card.id,answer,sources:[page],suggestions:[draftLabel[lang]]};
  }
  const date=timing(messages,en);
  const school=messages.some(m=>/klasse|class\b|school|schule|students/i.test(m));
  const plural=school || details.some(d=>/\b(?:wir|uns|we|our|us)\b/i.test(d.raw));
  let body:string;
  if (topic==="ressourcen") {
    const device=term(details,equipment,en) ?? (en?"measuring equipment":"ein Messgerät");
    const measure=term(details,measurements,en);
    body=en?(school?"Our class":plural?"We":"I")+" would like to borrow "+device+(measure?" to measure "+measure:"")+". Could you confirm availability and any cost?"
      :(school?"Unsere Klasse möchte ":plural?"Wir möchten ":"Ich möchte ")+device+" ausleihen"+(measure?", um "+measure+" zu messen":"")+". Können Sie "+(plural?"uns":"mir")+" sagen, ob das möglich ist und welche Kosten anfallen?";
  } else if (topic==="workshops") {
    const subject=term(details,[[/klima|climate/i,"zum Klima"," on climate"],[/medien|media literacy/i,"zu Medienkompetenz"," on media literacy"],[/stress/i,"zu Stressbewältigung"," on managing stress"]],en);
    body=en?"Could you offer a workshop"+(subject??"")+" for our class"+(place?" in "+place:"")+"? What dates would be possible, and would there be a cost?"
      :"Wäre ein Workshop"+(subject?" "+subject:"")+" für unsere Klasse"+(place?" in "+place:"")+" möglich? Welche Termine kämen infrage und welche Kosten würden anfallen?";
  } else if (topic==="connections") {
    const field = term(details, measurements, en) ?? (en ? "[field of research]" : "[Fachgebiet]");
    body = en ? "Could you introduce us to a researcher working on " + field + "? Our question is: [what we would like to find out]."
      : "Könnten Sie uns jemanden aus der Forschung zum Thema " + field + " vorstellen? Unsere Frage ist: [Was möchten wir herausfinden?]";
  } else if (topic==="spenden-bestaetigung") {
    body = en ? "Could you send me confirmation of my donation?\n\nDate of donation: [date]\nAmount: [amount]"
      : "Könnten Sie mir bitte meine Spende bestätigen?\n\nDatum der Spende: [Datum]\nBetrag: [Betrag]";
  } else if (topic==="finanzierung") {
    body=en?"Could you help us estimate the costs of our project and identify potential funding partners?":"Können Sie uns helfen, die Kosten unseres Projekts einzuschätzen und mögliche Förderpartner zu finden?";
  } else {
    body=en?"I would like to develop a research idea. Could we arrange a meeting to discuss it?":"Ich möchte eine Forschungsidee weiterentwickeln. Können wir dafür einen Beratungstermin vereinbaren?";
  }
  const latestEdit=details.findLast(d=>d.raw!==d.text);
  if (topic==="ressourcen" && latestEdit && ![...equipment,...measurements].some(([pattern])=>pattern.test(latestEdit.text))
      && [...equipment,...measurements].some(([pattern])=>pattern.test(latestEdit.raw))) {
    body+="\n\n"+(en?"What we need: ":"Was wir brauchen: ")+latestEdit.text;
  }
  if (date && topic !== "spenden-bestaetigung") body+="\n\n"+(en?"Preferred timing: ":"Gewünschter Zeitraum: ")+date;
  const answer=(en?"Hello ForJu team,":"Hallo ForJu-Team,")+"\n\n"+body+"\n\n"+(en?"Thank you!":"Vielen Dank!");
  const sources=[page];
  if (card.requestUrl) sources.push({title:en?"Open the enquiry form":"Anfrageformular öffnen",url:readerUrl(card.requestUrl)});
  const contact=records.find(r=>r.id==="kontakt");
  const contactRecord=topic==="workshops"?card.booking?.de:topic==="spenden-bestaetigung"?card.content:contact?.content;
  const recipient=contactRecord?.match(/\b[A-Za-z0-9._+-]+@forju\.at\b/i)?.[0];
  return {mode:"draft",topic:card.id,answer,sources,recipient};
}
