// Resolve the detail being asked about separately from the offer. Only complete
// follow-up questions qualify: a rental car, gym fee or unrelated age question
// must not silently inherit an earlier ForJu topic. Facts live in reviewed cards.
type Passage = {de:string; en:string};
type Card = {id:string; title:string; titleEn:string; sourceUrl:string; requestUrl?:string; pricing?:Passage; visitorAnswers?:Partial<Record<string,Passage>>};
type Detail = "price" | "duration" | "groupSize" | "loanPeriod" | "eligibility" | "preparation" | "remote" | "hours" | "experience";
export function offerDetail(message:string):Detail|undefined {
  const q=message.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/ß/g,"ss")
    .replace(/[’']/g,"'").replace(/[?.!,]+/g," ").replace(/\s+/g," ").trim()
    .replace(/^(?:und|and) /, "").replace(/^(?:bitte|please) /, "").replace(/ (?:bitte|please)$/, "");
  if (/^(?:can (?:i|we) (?:do (?:it|that)|volunteer|help) (?:remotely|from home)|is (?:it|that) remote|geht das (?:auch )?(?:remote|von (?:zu )?hause)|kann ich (?:auch )?(?:von (?:zu )?hause|remote) (?:mithelfen|mitmachen))$/.test(q)) return "remote";
  if (/^(?:how (?:much time do i need|many hours (?:a week )?(?:do i need|is it))|wie viel zeit (?:brauche ich|muss ich einplanen)|wie viele stunden (?:pro woche )?(?:sind das|brauche ich))$/.test(q)) return "hours";
  if (/^(?:do i need (?:any |prior )?experience|is experience required|brauche ich (?:schon |dafur )?erfahrung|ist erfahrung (?:notig|erforderlich))$/.test(q)) return "experience";
  if (/^(?:is it exactly \d{1,3} (?:minutes|hours)|dauert das genau \d{1,3} (?:minuten|stunden))$/.test(q)) return "duration";
  if (/^(?:was (?:kostet|kosten) (?:uns |mich |das |es )?(?:das|es)|was kostet (?:das|es)|wie (?:teuer ist|viel kostet) (?:das|es)|wie viel (?:mussen|sollen) wir (?:dafur )?(?:zahlen|bezahlen)|ist (?:das|es) (?:kostenlos|gratis)|how much (?:(?:does|would) (?:it|that|this) cost|is (?:it|that))|what (?:does|would) (?:it|that) cost|is (?:it|that) free)$/.test(q)) return "price";
  if (/^(?:wie lange (?:dauert|geht) (?:das|es|der|die|der workshop)|wie viel zeit (?:sollen|mussen) wir (?:dafur )?einplanen|how long (?:does|would) (?:it|that|this) (?:last|take)|how long is (?:it|the workshop))$/.test(q)) return "duration";
  if (/^(?:wie viele (?:kinder|schuler|schulerinnen|personen|teilnehmende) (?:durfen|konnen) (?:daran |dabei )?(?:teilnehmen|mitmachen)|wie gro[ss]+ (?:darf|kann) (?:die|unsere) gruppe sein|how many (?:pupils|students|children|people) can (?:take part|participate|join)|what is the (?:maximum |minimum )?group size)$/.test(q)) return "groupSize";
  if (/^(?:wie lange (?:durfen|konnen) (?:wir|ich) (?:es|das|sie|das gerat) (?:behalten|ausleihen|nutzen)|how long can (?:we|i) (?:keep|borrow|use) (?:it|that|them|the equipment)|for how (?:long|many days|many weeks) can (?:we|i) (?:borrow|keep|use) (?:it|them))$/.test(q)) return "loanPeriod";
  if (/^(?:gibt es (?:dafur )?(?:eine altersgrenze|ein mindestalter)|ab welchem alter (?:geht das|darf ich mitmachen)|ich bin (?:erst |nur )?\d{1,2} (?:jahre alt )?(?:geht das|darf ich (?:mitmachen|teilnehmen))|i(?:'m| am) (?:only |just )?\d{1,2} (?:years old )?(?:is that (?:okay|ok)|can i (?:join|take part))|is there (?:a minimum age|an age limit)|am i (?:old enough|eligible))$/.test(q)) return "eligibility";
  if (/^(?:was (?:muss|soll|kann) ich (?:dafur )?vorbereiten|was (?:mussen|sollen) wir (?:dafur )?vorbereiten|what (?:should|do|must) (?:i|we) (?:prepare|need to prepare)(?: for (?:it|that|this))?)$/.test(q)) return "preparation";
}
export function offerFollowUp(message:string, topic:string|undefined, en:boolean, records:Card[], readerUrl:(url:string)=>string) {
  const detail=offerDetail(message);
  if (!detail || !topic) return null;
  const selected=records.find(r=>r.id===topic);
  const volunteer = ["ehrenamt","jobs-tech","jobs-working-conditions"].includes(topic) && ["remote","hours","experience"].includes(detail);
  const card=volunteer ? records.find(r=>r.id==="jobs-working-conditions") : topic.startsWith("workshop-") ? records.find(r=>r.id==="workshops") : selected;
  if (!card || !selected) return null;
  const key=card.id==="mitglied" && (detail==="eligibility" || detail==="price") ? "terms" : detail;
  const passage=detail==="price" && card.pricing ? card.pricing : card.visitorAnswers?.[key];
  if (!passage) return null;
  const sources=[{title:en?card.titleEn:card.title,url:readerUrl(card.sourceUrl)}];
  if(card.requestUrl && card.requestUrl!==card.sourceUrl) sources.push({title:en?"Enquire with ForJu":"Bei ForJu anfragen",url:readerUrl(card.requestUrl)});
  return {mode:"library",topic:selected.id,answer:passage[en?"en":"de"],sources};
}
