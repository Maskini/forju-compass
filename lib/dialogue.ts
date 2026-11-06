import MiniSearch from "minisearch";
import type { ChatMessage } from "./chat";

type Pair = [string, string];
type Menu = "start" | "class" | "project";
type Topic = "workshops" | "ressourcen" | "finanzierung" | "science-beratung" | "connections" | "ehrenamt";
type Intent = Menu | Topic | "short" | "next";
type Card = {title:string; titleEn:string; id:string; content:string; contentEn:string; sourceUrl:string; requestUrl?:string; booking?:{de:string;en:string}};
type Reply = {mode:"conversation"|"library"; answer:string; sources:{title:string;url:string}[]; suggestions?:string[]; topic?:string};

const menus:Record<Menu,{ask:Pair; options:Intent[]}> = {
  start:{ask:["Was führt dich zu ForJu: Suchst du etwas für deine Klasse, arbeitest du an einem eigenen Projekt oder möchtest du mithelfen?","What brings you to ForJu: are you looking for something for your class, working on your own project, or hoping to volunteer?"],options:["class","project","ehrenamt"]},
  class:{ask:["Was würde eurer Klasse helfen: ein Workshop, ein Gerät zum Messen oder Hilfe bei der Finanzierung?","What would help your class: a workshop, equipment to take measurements, or help finding funding?"],options:["workshops","ressourcen","finanzierung"]},
  project:{ask:["Wobei brauchst du für dein Projekt gerade Hilfe: die Idee ausarbeiten, Geräte finden, die Finanzierung klären oder jemanden aus der Forschung kennenlernen?","Where do you need help with your project: shaping the idea, finding equipment, finding funding, or meeting someone in research?"],options:["science-beratung","ressourcen","finanzierung","connections"]}
};
const labels:Record<Intent,Pair> = {
  start:["Wo fange ich an?","Where do I start?"],class:["Für meine Klasse","For my class"],project:["Für mein Projekt","For my project"],
  ehrenamt:["Bei ForJu mithelfen","Volunteer with ForJu"],workshops:["Einen Workshop","A workshop"],ressourcen:["Ein Messgerät","Measuring equipment"],
  finanzierung:["Hilfe bei der Finanzierung","Help with funding"],"science-beratung":["Die Idee ausarbeiten","Shape my idea"],connections:["Kontakte knüpfen","Meet a researcher"],
  short:["Einfacher erklären","Explain more simply"],next:["Was ist der nächste Schritt?","What should I do next?"]
};
// Each example is indexed separately. A visitor's entire meaningful phrase must
// fit one example; a single shared word must not override a substantive question.
const phrases:Record<Intent,string[]> = {
  start:["Ich weiß nicht wo ich anfangen soll","Ich brauche Hilfe beim Einstieg","Ich brauche Hilfe","Kannst du mir helfen","I need help","Can you help me","I need some guidance","Ich bin neu hier","Ich bin mir nicht sicher wo ich anfangen soll","I don't know where to start","Not sure where to begin","I am lost","I don’t know what to do","How do I get started","Where should I start","Keine Ahnung wo ich anfangen soll","Kannst du mir den Einstieg zeigen","I'm new here","Where should I begin","I'm not sure what I need","Was kann ich hier machen"],
  class:["Meine Schulklasse","Wir sind eine Schulklasse","Ich bin Lehrerin","Ich bin Lehrer","something for my school","für unsere Schule","for my students","for our school","I'm a teacher","something for my class","school class"],
  project:["Mein eigenes Forschungsprojekt","Ich habe eine Projektidee","I'm working on a project","I have a research idea","my own project"],
  workshops:["Schulworkshop","workshops","workshop please","Wir möchten einen Workshop","a session for our class"],
  ressourcen:["Geräte ausleihen","etwas zum Messen","Wir brauchen etwas zum Messen","Messgeräte ausleihen","equipment to take measurements","we need something to measure with","borrow a device","borrow some equipment","sensors"],
  finanzierung:["Wir brauchen Geld","Geld für unser Projekt","Förderung","Finanzierung","we need money","funding","financial help","money for supplies"],
  "science-beratung":["Hilfe mit meiner Idee","Beratung zu meiner Idee","help developing my idea","advice on my idea"],
  connections:["Jemanden aus der Forschung kennenlernen","Kontakte finden","research contacts","meet someone in research"],
  ehrenamt:["Ich will mich engagieren","ehrenamtlich mitmachen","ich möchte freiwillig mithelfen","volunteering","I'd like to volunteer"],
  short:["Kannst du das einfacher sagen","Kannst du das bitte einfacher erklären","Erklär das nochmal in einfachen Worten","Kurz gesagt","Fass das kurz zusammen","Das verstehe ich nicht","Ich verstehe das nicht","In einfachen Worten","Can you say that more simply","Could you explain in plain English","Can you explain that in simpler words","I don't understand","Give me the short version","Could you rephrase that","What do you mean","Wie meinst du das","Bitte einfacher","simpler please","can you simplify that"],
  next:["Wie geht es jetzt weiter","was mache ich jetzt","Und dann","was sollen wir als nächstes tun","what now","what's next","how do I get started with that","what do we do next","what's the next step","where do I send the details","where should I send that","wohin schicke ich die Angaben","an wen soll ich schreiben"]
};
function normalize(s:string) {return s.toLowerCase().normalize("NFKD").replace(/\p{M}/gu,"").replace(/ß/g,"ss").replace(/[’']/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
const filler = new Set("ich wir du das der die den dem ein einen einem etwas bitte denn mal und i im am we do can could you me my our a an the please that it to for fur meine mein unser unsere".split(" "));
function tokens(s:string){return normalize(s).split(" ").filter(w=>w && !filler.has(w));}
type Example = {id:number;intent:Intent;words:string[]};
const examples:Example[] = [];
for(const key of Object.keys(phrases) as Intent[]) for(const phrase of [...labels[key],...phrases[key]]) examples.push({id:examples.length,intent:key,words:tokens(phrase)});
const index=new MiniSearch({fields:["text"]});
index.addAll(examples.map(e=>({id:e.id,text:e.words.join(" ")})));
function recognize(s:string, allowed?:Intent[]):Intent|undefined {
  const words=tokens(s);
  if(!words.length || words.length>11) return;
  const hits=index.search(words.join(" "),{combineWith:"AND",fuzzy:t=>t.length>=5 ? 1 : false});
  const candidates=hits.map(h=>examples[h.id]).filter(e=>(!allowed||allowed.includes(e.intent)) && Math.abs(words.length-e.words.length)<=1
    && (words.length>1 || e.words.length===1));
  return candidates[0]?.intent;
}
const brief:Record<Topic,Pair>={
  ressourcen:["Ihr könnt über ForJu bei Partnern nach einem Messgerät fragen. Schreibt ins Formular, was ihr messen wollt und wann. Ob es das Gerät gibt und was es kostet, muss das Team erst klären.","You can ask ForJu to find measuring equipment through its partners. Tell them what you want to measure and when. The team needs to check whether a device is available and what it costs."],
  workshops:["ForJu beschreibt Workshops für Wiener Schulen, etwa zu Klima, Stress oder Medien. Wenn euch ein Thema interessiert, fragt Anja Hofer nach einem Termin für eure Klasse.","ForJu describes workshops for schools in Vienna on topics like climate, stress and media. If a topic interests your class, ask Anja Hofer about a date."],
  finanzierung:["ForJu gibt euch selbst kein Geld. Das Team hilft euch, die Kosten abzuschätzen und mögliche Förderpartner zu finden. Beschreibt dazu eure Idee im Formular.","ForJu doesn’t give out project money itself. It helps you estimate costs and find possible funding partners. Tell the team about your idea in the enquiry form."],
  "science-beratung":["Du musst noch keinen fertigen Plan haben. Schreib an office@forju.at, woran du forschen möchtest, und bitte um ein Beratungsgespräch.","You can ask for advice while your idea is still taking shape. Email office@forju.at with what you want to research and ask for a meeting."],
  connections:["Suchst du jemanden aus Forschung oder Wirtschaft für dein Projekt? Schreib ForJu, wen du kennenlernen möchtest und warum. Das Team kann bei der Kontaktaufnahme helfen.","Looking for someone in research or industry for your project? Tell ForJu who you want to meet and why. The team can help you make contact."],
  ehrenamt:["Bei ForJu arbeiten Freiwillige mit, zum Beispiel in Bildung oder IT. Schau dir die Stellen auf der ForJu-Website an und prüfe, welche noch offen sind.","Volunteers help ForJu with areas like education and IT. Look at the roles on the ForJu website and check which ones are currently open."]
};
// Keep explanations and actions distinct: “what next?” must not repeat the
// answer the visitor has just read. All links are supplied by the public card.
const action:Partial<Record<Topic,Pair>>={
  ressourcen:["Öffne das Ressourcenformular unten. Schreib hinein, was ihr messen möchtet und für welchen Zeitraum ihr das Gerät braucht. Bitte das Team, Verfügbarkeit und Preis zu bestätigen.","Open the equipment enquiry form below. Say what you want to measure and when you need the device. Ask the team to confirm availability and cost."],
  finanzierung:["Öffne die Finanzierungsanfrage. Beschreibe die Idee und wofür Geld fehlt. Bitte ForJu um Hilfe bei der Kostenschätzung oder bei der Suche nach Förderpartnern.","Open the funding enquiry. Describe your idea and what you need money for. Ask ForJu for help estimating costs or finding funding partners."],
  "science-beratung":["Schreib an office@forju.at, was dich interessiert, und bitte um einen Gesprächstermin. Du kannst dafür auch das Projektformular unten nutzen.","Email office@forju.at with the question you want to explore and ask for a meeting. You can also use the project enquiry form below."],
  connections:["Öffne das Kontaktformular unten. Erklär kurz, für welche Frage ihr jemanden aus Forschung oder Wirtschaft sucht.","Open the introductions form below. Tell ForJu what you want to ask someone in research or industry."],
  ehrenamt:["Sieh nach, welche Rollen auf ForJus Jobs-Seite stehen. Such dir eine passende aus und nutze die dort genannten Bewerbungsdetails.","Check the roles on ForJu’s jobs page. Choose one that fits and use the application details on that page."]
};
function isMenu(id:Intent):id is Menu{return Object.hasOwn(menus,id);}
function isTopic(id:string):id is Topic{return Object.hasOwn(brief,id);}
function ordinal(s:string){
  const choices=[["1","erste","erstes","das erste","die erste","first","the first one"],["2","zweite","zweites","das zweite","die zweite","second","the second one"],["3","dritte","drittes","das dritte","die dritte","third","the third one"],["4","vierte","viertes","das vierte","fourth","the fourth one"]];
  return choices.findIndex(c=>c.includes(normalize(s)));
}
export function isGuidedPrompt(answer:string){
  return Object.values(menus).some(m=>m.ask.includes(answer));
}
export function guidedReply(message:string,en:boolean,history:ChatMessage[],records:Card[],topicHint?:string):Reply|null {
  const lang=en?1:0, last=history.filter(t=>t.role==="assistant").at(-1)?.content;
  const menu=(Object.values(menus)).find(m=>m.ask.some(s=>s===last));
  const offer=(id:Menu):Reply=>({mode:"conversation",answer:menus[id].ask[lang],sources:[],suggestions:menus[id].options.map(o=>labels[o][lang])});
  // Only strip conversational correction prefixes, never strip a negation
  // from the requested subject (“not funding” is not a funding request).
  const request=message.replace(/^(?:nein[, ]+ich (?:meine|meinte)|eigentlich meine ich|no[, ]+i (?:mean|meant)|actually[, ]+i (?:mean|meant))\s+/i,"");
  const choice=menu?.options[ordinal(request)] ?? (menu&&recognize(request,menu.options));
  const kind=choice??recognize(request);
  if(!kind) {
    if(menu && /^(?:ja|yes|klar|sure|ok|okay|maybe|vielleicht|keine ahnung|not sure|weiss nicht)$/i.test(normalize(message))) {
      return {mode:"conversation",answer:menu.ask[lang],sources:[],suggestions:menu.options.map(o=>labels[o][lang])};
    }
    return null;
  }
  if(isMenu(kind)) return offer(kind);
  const follow=kind==="short"||kind==="next";
  // The client may name a topic, never a source or a fact. Older clients can
  // recover it from an exact match to an answer the catalog actually contains.
  const known=records.find(r=>r.id===topicHint) ?? records.find(r=>[r.content,r.contentEn,r.booking?.de,r.booking?.en,...(isTopic(r.id)?brief[r.id]:[])].includes(last??""));
  if(follow && menu) return {mode:"conversation",answer:menu.ask[lang],sources:[],suggestions:menu.options.map(o=>labels[o][lang])};
  if(follow && !known) return offer("start");
  const card=follow?known:records.find(r=>r.id===kind);
  if(!card)return null;
  const group=card.id.startsWith("workshop-")?"workshops":card.id;
  const main=group!==card.id?records.find(r=>r.id===group)??card:card;
  const url=(s:string)=>en?s.replace(/^https:\/\/forju\.at\/de(?=[/#?]|$)/,"https://forju.at/en"):s;
  const sources=[{title:en?card.titleEn:card.title,url:url(card.sourceUrl)}];
  if(card.requestUrl && card.requestUrl!==card.sourceUrl)sources.push({title:en?"Open the enquiry form":"Anfrageformular öffnen",url:url(card.requestUrl)});
  let answer:string;
  if(kind==="next" && main.booking) {answer=main.booking[en?"en":"de"]; if(main.sourceUrl!==card.sourceUrl)sources.push({title:en?main.titleEn:main.title,url:url(main.sourceUrl)});}
  else if(kind==="next" && isTopic(group) && action[group]) {
    answer=action[group][lang];
    if(group==="ehrenamt") {
      const jobs=records.find(r=>r.id==="jobs-tech");
      if(jobs)sources.push({title:en?"ForJu jobs":"Stellen bei ForJu",url:url(jobs.sourceUrl)});
    }
  }
  else if (kind === "next" && group === "spenden-bestaetigung") answer = en ? card.contentEn : card.content;
  else if(kind==="short" && isTopic(group))answer=brief[group][lang];
  else if(!follow)answer=en?card.contentEn:card.content;
  else if(kind==="next")answer=en?"Open the ForJu page below for the details. If your question is still open, you can ask the team.":"Öffne die ForJu-Seite unten für die Details. Falls deine Frage offenbleibt, kannst du das Team fragen.";
  else return {mode:"conversation",answer:en?"Which word or part of the answer would you like me to explain?":"Welches Wort oder welchen Teil der Antwort soll ich erklären?",sources:[],topic:card.id};
  return {mode:"library",answer,sources,topic:card.id,suggestions:kind==="next"?undefined:[labels.next[lang]]};
}
