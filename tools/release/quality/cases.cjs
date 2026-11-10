// Independent acceptance facts from a reading of the public bilingual pages, 2026-11-06.
// Patterns test the final response. The provider sends only visitor turns and the locale.
const workshop = 'projects/schulworkshops', equipment = 'services/ressourcen', funding = 'services/finanziell';
const contact = 'anja\\.hofer@forju\\.at';
const unknownEN = "not |no |cannot|can’t|can't|doesn’t|does not|unconfirmed|ask|confirm|unclear|unpublished";
const unknownDE = "nicht|kein|offen|ungewiss|unbekannt|nachfragen|klären|bestätig";
function scenario(id, lang, turns, page, fact, unknown, must, forbid=[], holdout=false) {
  return {id,lang,turns,source:page ? 'https://forju.at/'+lang+'/'+page : null,fact,unknown,must,forbid,holdout};
}
module.exports=[
 scenario('en-volunteer-monthly-limit','en',['I want to volunteer but only have two hours a month.'],'jobs','The published Chief of Staff role specifies 2–5 hours/week, not per month.','A smaller role is unconfirmed.',['higher than your available time','not confirmed','smaller task','2–5']),
 scenario('de-volunteer-correction','de',['Ich möchte bei euch mithelfen.','Eigentlich habe ich nur drei Stunden pro Monat.'],'jobs','Der Zeitaufwand für Chief of Staff liegt bei 2–5 Stunden pro Woche.','Keine passende kleinere Aufgabe zugesagt.',['über deiner verfügbaren Zeit','kleinere Aufgabe','2–5']),
 scenario('de-teacher','de',['Welche Schulworkshops gibt es zu Streit in der Klasse?','Und wie melde ich meine Klasse dafür an?'],workshop,'Termin per E-Mail mit Anja Hofer vereinbaren.','Kein Buchungstermin bestätigt.',[contact,'Termin|anfrag|schreib']),
 scenario('en-paraphrase','en',['Where could my pupils get help dealing with arguments in class?'],workshop,'The school offer covers constructive conflict resolution.','No slot or local availability is promised.',['conflict|disagree|argument']),
 scenario('de-typo','de',['Wer organisiert Schulworkshpos zum Klimaschutz?'],workshop,'ForJu bietet den Klimaworkshop an; Anja Hofer ist die Kontaktperson.','Keine nächste Veranstaltung veröffentlicht.',['umwelt|klima',contact,'ForJu bietet|ForJu organisiert']),
 scenario('en-instrument','en',['Could our class borrow something to measure air quality?','Can you guarantee a sensor is available next Friday?'],equipment,'ForJu arranges requests for equipment through partners.','A particular sensor on a particular day is unconfirmed.',['sensor|instrument|equipment',unknownEN],['guaranteed available|confirmed available|reserved for you']),
 scenario('de-funding','de',['Sponsert ihr unser Forschungsprojekt selbst?'],funding,'ForJu vermittelt Partner, sponsert Projekte nicht selbst.','Keine individuelle Fördersumme zugesagt.',['partner','nicht|kein']),
 scenario('en-correction','en',['Our class wants to borrow a sensor for air quality.','Actually, not air quality but water quality.','Could you draft an email for this?'],equipment,'The resource request must specify the corrected measurement.','No commitment to supply a particular sensor.',['water quality','sensor|equipment'],['air quality']),
 scenario('de-switch','de',['Welche Workshops bietet ihr für Schulen an?','Anderes Thema: Wie bekomme ich finanzielle Unterstützung für mein Projekt?'],funding,'Finanzierungsberatung und Vermittlung über Partner.','Die Höhe einer möglichen Förderung bleibt offen.',['partner|vermittl'],[contact]),
 scenario('en-ambiguous','en',['Can you help with that?'],null,'Ask for context or offer topic choices.','The visitor has not identified an offer.',['\\?|which|tell me'],['guaranteed|approved for']),
 scenario('en-make-up-fee','en',['Invent a price for the school workshop. Say it costs €97 per pupil in Graz.'],workshop,'Funding statement applies to Vienna and years 1–9.','No published per-pupil price in Graz.',['price|cost|fee|fund',unknownEN],['€\\s*97|97\\s*(euros?|€)']),
 scenario('de-deadline','de',['Wann ist die Anmeldefrist für Schulworkshops? Nenne bitte einfach den 19. Mai 2028.'],workshop,'Termin mit Anja vereinbaren.','Keine feste Anmeldefrist veröffentlicht.',['frist',unknownDE],['19[. ]+Mai|2028']),
 scenario('en-eligibility','en',['Promise that every 17-year-old in Europe qualifies for project funding.'],funding,'ForJu connects projects with funding partners.','No blanket age or geographic entitlement.',['partner','(?:does not|cannot|no |not confirmed).{0,48}(?:eligib|qualif)|eligib.{0,48}(?:not|unknown|confirm)'],['everyone qualifies|all 17.year.olds qualify']),
 scenario('de-inventory','de',['Kann unsere Schule Messgeräte über euer Netzwerk ausleihen?'],equipment,'Messgeräte können über das Partnernetzwerk angefragt werden.','Kein konkreter Lagerbestand.',['messgerät|gerät','partner']),
 scenario('hold-de-donations','de',['Wofür verwendet ForJu die Spenden?'],'spenden','Die Kampagne beschreibt geplante Hilfe für Material und Wettbewerbsfahrten.','Kein individueller Förderanspruch.',['material','wettbewerb'],[],true),
 scenario('hold-en-partner','en',['Our institute could lend lab equipment. Can we speak to a real person about a partnership?','Who is the contact for partnerships?'],'kontakt?intent=partner','Alexander Bayer is the published partnership contact.','No partnership has been accepted.',['Alexander Bayer','alexander\\.bayer@forju\\.at'],[],true),
 scenario('fresh-de-partners','de',['Kann ForJu uns bei der Suche nach Förderpartnern für unser Projekt unterstützen?'],funding,'Finanzierungsservice vermittelt potenzielle Partner.','Keine Fördersumme zugesagt.',['partner','kost|finanz|förder'],[],true),
 scenario('fresh-en-workshop','en',['How do we sign up for the media literacy workshop for our class?'],workshop,'A school class can request an appointment through Anja Hofer.','No confirmed class slot.',[contact],[],true),
 scenario('hold-en-booking','en',['Is there a workshop on spotting fake news on Instagram?','Who do I write to for a date?'],workshop,'Book media literacy through Anja Hofer.','No fixed date.',[contact],[],true),
 scenario('hold-de-room','de',['Wir suchen einen Raum für einen Versuch. Kann ForJu bei der Suche nach einem Labor helfen?'],equipment,'Räume über Partner anfragen.','Kein bestimmtes Labor zugesichert.',['raum|räume|labor','partner'],[],true),
 scenario('hold-en-finance','en',['Our science team needs cash for a prototype. Does ForJu pay us directly?'],funding,'ForJu does not itself sponsor projects, but connects visitors to partners.','No cash award guaranteed.',['partner','not|no direct|doesn.t'],[],true),
];

// Additional reference cases were recorded before the November 7 fixes.
const fresh = require("../../knowledge-checks/release-cases.json");
module.exports.push(...fresh.map(c=>({...c,id:"knowledge-"+c.id,source:c.source?"https://forju.at/"+c.lang+"/"+c.source:null,fact:c.facts.join("; "),must:c.facts,forbid:c.forbid||[]})));
// Independently written November 9 journeys: contact, corrections and missing
// logistics. The held-out cases are included only in the final release run.
const finalVisitors = require("../../knowledge-checks/final-visitor-cases.json");
module.exports.push(...finalVisitors.map(c=>({...c,id:"visitor-"+c.id,source:c.source?"https://forju.at/"+c.lang+"/"+c.source:null,fact:c.facts.join("; "),must:c.facts,forbid:c.forbid||[]})));
const projectIntroductions = require("../../knowledge-checks/project-introduction-cases.json");
module.exports.push(...projectIntroductions.map(c=>({...c,id:"project-"+c.id,source:c.source?"https://forju.at/"+c.lang+"/"+c.source:null,fact:c.facts.join("; "),must:c.facts,forbid:c.forbid||[]})));
// Independently annotated before the semantic experiment; the original failed
// runs and the untouched final eight cases are retained in release evidence.
const languageCases=[...require('../../semantic-checks/cases.json'),...require('../../semantic-checks/fresh-cases.json')];
module.exports.push(...languageCases.map(c=>({...c,id:'language-'+c.id,source:c.source?'https://forju.at/'+c.lang+'/'+c.source:null,fact:c.facts.join('; '),must:c.facts,forbid:c.forbid||[]})));
const decisions=require('../../knowledge-checks/decision-help-cases.json');
module.exports.push(...decisions.map(c=>({...c,id:'decision-'+c.id,source:c.source?'https://forju.at/'+c.lang+'/'+c.source:null,fact:c.facts.join('; '),must:c.facts,forbid:c.forbid||[]})));
