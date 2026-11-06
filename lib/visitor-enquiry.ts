import { de, en as english } from "chrono-node";
import placeNames from "../knowledge/language/austrian-places.json" with { type: "json" };
import type { ChatMessage } from "./chat";

type Card = { id: string; title: string; titleEn: string; sourceUrl: string; requestUrl?: string; content:string; booking?:{de:string;en:string}; coverage?:{places:string[];de:string;en:string} };
type Topic = "ressourcen" | "workshops" | "finanzierung" | "science-beratung";
const subjectTerms: [Topic, RegExp][] = [
  ["ressourcen", /sensor|messgerät|messger[aä]t|ausleih|messinstrument|borrow|equipment|microscope|mikroskop|gerät.*leihen/i],
  ["workshops", /workshops?|schulseminar/i],
  ["finanzierung", /finanzier|förderpartner|funding|fundrais/i],
  ["science-beratung", /beratung|research idea|projektidee|project idea/i],
];
const askForDraft = /(?:schreib|formulier|verfass|entw[iu]rf|vorbereit|draft|compose|prepare|write|wording|vorlage|text für).{0,65}(?:e[ -]?mail|anfrage|nachricht|message|enquiry|inquiry)|(?:e[ -]?mail|anfrage|nachricht|message|enquiry|inquiry).{0,45}(?:formulier|schreib|entwerf|vorbereit|verfass|draft|template)|(?:what should i write|was (?:soll|kann) ich schreiben)/i;
const chooseSubject = [
  "Worum soll es in deiner Anfrage gehen: um Geräte, einen Schulworkshop, Finanzierung oder eine Projektidee?",
  "What would you like to ask ForJu about: equipment, a school workshop, funding or a project idea?",
];
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
function term(messages:string[], terms:[RegExp,string,string][],en:boolean) {
  for (const message of messages.toReversed()) {
    const hit=terms.find(([pattern])=>pattern.test(message));
    if (hit) return hit[en?2:1];
  }
}
export function visitorEnquiry(
  message:string, en:boolean, history:ChatMessage[], hint:string|undefined, records:Card[], readerUrl:(url:string)=>string
) {
  const lang=en?1:0;
  const current=topicOf(message);
  const prior=hint?.startsWith("workshop-")?"workshops":hint;
  const asks=askForDraft.test(message) && !/(?:don.t|do not|keine?|nicht)\s+(?:write|draft|e-?mail|anfrage|schreiben)/i.test(message);
  const answeringPrompt=chooseSubject.includes(history.at(-1)?.content ?? "");
  const topic=current ?? prior ?? topicOf(history.filter(t=>t.role==="user").at(-1)?.content ?? "");
  const card=records.find(r=>r.id===topic);
  const lastAnswer=history.at(-1)?.content ?? "";
  const revising=/^(?:Hello ForJu team,|Hallo ForJu-Team,)/.test(lastAnswer)
    && /^(?:actually|correction|make that|change (?:it|the date)|korrektur|doch|eigentlich|ändere)\b/i.test(message);
  const wantDraft=asks || answeringPrompt || revising;
  if (!wantDraft && topic!=="workshops") return null;
  if (wantDraft && !subjectTerms.some(([id])=>id===topic)) {
    return {mode:"conversation",answer:chooseSubject[lang],sources:[],suggestions:en?["Equipment","School workshop","Funding","Project idea"]:["Messgeräte","Schulworkshop","Finanzierung","Projektidee"]};
  }
  if (!card) return null;
  const page={title:en?card.titleEn:card.title,url:readerUrl(card.sourceUrl)};
  // Carry only recognized details from user turns about this subject. The
  // assistant's text and unrelated conversations never become email content.
  const messages:string[]=[];
  for (const turn of history.toReversed()) {
    if (turn.role!=="user") continue;
    const previousTopic=topicOf(turn.content);
    if (current && prior && current!==prior) break;
    if (previousTopic && previousTopic!==topic) break;
    // Only a relevant subject or an explicit logistical detail can fill a slot.
    if (previousTopic===topic || visitQuestion.test(turn.content) ||
        /^(?:actually|correction|make that|instead|timing|our class|korrektur|doch|zeitraum|termin|unsere klasse)\b/i.test(turn.content)) {
      messages.unshift(turn.content);
    }
  }
  messages.push(message);
  const currentPlace=namedPlace(message);
  const mentionedPlace=messages.toReversed().find(m=>namedPlace(m));
  const place=mentionedPlace && !/(?:außerhalb|ausserhalb|outside)(?: of| von)? (?:Wien|Vienna)/i.test(mentionedPlace)
    ? namedPlace(mentionedPlace) : undefined;
  if (!wantDraft) {
    const asksWhere=/bei uns|zu uns|at our school|our area|come to|travel to|outside|außerhalb|ausserhalb/i.test(message);
    const askedAboutPlace=(visitQuestion.test(message) && (currentPlace || asksWhere))
      || (currentPlace && message.trim().split(/\s+/).length<=3);
    if (!askedAboutPlace || !card.coverage) return null;
    const inArea=place && card.coverage.places.includes(place) && !/au[ßs]+erhalb|outside/i.test(message);
    const area=place && !inArea?place:undefined;
    const where=area?" in "+area:(en?" at your school":" an eurer Schule");
    const text=card.coverage[en?"en":"de"]+" ";
    const details=inArea ? (en?"Ask the workshop contact to confirm a date for your class.":"Ob ein Termin für eure Klasse frei ist, klärt ihr mit dem Workshopkontakt.")
      : en?"A visit"+where+" needs confirmation. Ask the workshop contact whether the team can come to you.":"Ob ein Workshop"+where+" möglich ist, geht daraus nicht hervor. Frag beim Workshopteam nach, ob es zu euch kommen kann.";
    return {mode:"library",topic:card.id,answer:text+details,sources:[page],suggestions:[draftLabel[lang]]};
  }
  const date=timing(messages,en);
  const school=messages.some(m=>/klasse|class\b|school|schule|students/i.test(m));
  let body:string;
  if (topic==="ressourcen") {
    const device=term(messages,equipment,en) ?? (en?"measuring equipment":"ein Messgerät");
    const measure=term(messages,measurements,en);
    body=en?(school?"Our class":"I")+" would like to borrow "+device+(measure?" to measure "+measure:"")+". Could you confirm availability and any cost?"
      :(school?"Unsere Klasse möchte ":"Ich möchte ")+device+" ausleihen"+(measure?", um "+measure+" zu messen":"")+". Können Sie uns sagen, ob das möglich ist und welche Kosten anfallen?";
  } else if (topic==="workshops") {
    const subject=term(messages,[[/klima|climate/i,"zum Klima"," on climate"],[/medien|media literacy/i,"zu Medienkompetenz"," on media literacy"],[/stress/i,"zu Stressbewältigung"," on managing stress"]],en);
    body=en?"Could you offer a workshop"+(subject??"")+" for our class"+(place?" in "+place:"")+"? What dates would be possible, and would there be a cost?"
      :"Wäre ein Workshop"+(subject?" "+subject:"")+" für unsere Klasse"+(place?" in "+place:"")+" möglich? Welche Termine kämen infrage und welche Kosten würden anfallen?";
  } else if (topic==="finanzierung") {
    body=en?"Could you help us estimate the costs of our project and identify potential funding partners?":"Können Sie uns helfen, die Kosten unseres Projekts einzuschätzen und mögliche Förderpartner zu finden?";
  } else {
    body=en?"I would like to develop a research idea. Could we arrange a meeting to discuss it?":"Ich möchte eine Forschungsidee weiterentwickeln. Können wir dafür einen Beratungstermin vereinbaren?";
  }
  if (date) body+="\n\n"+(en?"Preferred timing: ":"Gewünschter Zeitraum: ")+date;
  const answer=(en?"Hello ForJu team,":"Hallo ForJu-Team,")+"\n\n"+body+"\n\n"+(en?"Thank you!":"Vielen Dank!");
  const sources=[page];
  if (card.requestUrl) sources.push({title:en?"Open the enquiry form":"Anfrageformular öffnen",url:readerUrl(card.requestUrl)});
  const contact=records.find(r=>r.id==="kontakt");
  const contactRecord=topic==="workshops"?card.booking?.de:contact?.content;
  const recipient=contactRecord?.match(/\b[A-Za-z0-9._+-]+@forju\.at\b/i)?.[0];
  return {mode:"draft",topic:card.id,answer,sources,recipient};
}
