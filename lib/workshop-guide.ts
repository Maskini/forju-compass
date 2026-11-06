import MiniSearch from "minisearch";

type Workshop = {
  id: string;
  title: string;
  titleEn: string;
  sourceUrl: string;
  content: string;
  contentEn: string;
  visitorPhrases?: string[];
  booking?: {de:string; en:string};
  plainLanguage?: { de: string; en: string };
};
const normalize = (text: string) => text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/ß/g,"ss");
const words = (text: string) => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const label = (card: Workshop, en: boolean) => en ? card.titleEn : card.title;

// Every word of a short, reviewed cue must be present. A school or a pupil
// alone cannot constitute evidence for a particular activity.
export function createWorkshopGuide(catalog: Workshop[]) {
  const booking = catalog.find(card=>card.id==="workshops")?.booking;
  const workshops = catalog.filter(card => card.visitorPhrases?.length && card.plainLanguage);
  const examples = workshops.flatMap(card => card.visitorPhrases!.map(phrase => ({
    card, terms: [...new Set(words(phrase))], phrase: normalize(phrase),
  })));
  const index = new MiniSearch({fields:["phrase"], tokenize:words});
  index.addAll(examples.map((example,id)=>({id, phrase:example.phrase})));

  const prompt = (p: Workshop[], en: boolean) => en
    ? "Which workshop would you like to explore first: "+p.map(c=>label(c,en)).join(" or ")+"?"
    : "Welcher Workshop interessiert euch zuerst: "+p.map(c=>label(c,en)).join(" oder ")+"?";
  const choices = workshops.flatMap((first,i) => workshops.slice(i+1).map(second=>[first,second]));
  const menus = new Map(choices.flatMap(pair => [true,false].map(en=>[prompt(pair,en),pair] as const)));

  return (message: string, prior: string | undefined, lastAnswer: string | undefined, en: boolean, readerUrl: (url: string)=>string) => {
    const previousMenu = menus.get(lastAnswer ?? "");
    const q = normalize(message);
    const inSchool = /schul|klasse|workshop|\bpupils?\b|\bstudents?\b|\bclass(?:room)?\b|\bteachers?\b|\bschools?\b/.test(q);
    const follow = !!prior && (prior === "workshops" || prior.startsWith("workshop-"));
    if (!inSchool && !previousMenu && !follow) return null;
    // Let the booking, coverage and missing-information paths answer logistics.
    if (/anmeld|deadline|\bfrist|bis wann|sign up|register|kosten|preis|cost|price|frei(?:e|er)? termin|available|contact|kontakt|borrow|ausleih|funding/.test(q)) return null;
    const choice = previousMenu?.find(card => [card.title,card.titleEn].some(t=>normalize(t)===q.trim()));
    const ordinal = /^(?:1|first|the first(?: one)?|das erste|die erste|den ersten|der erste)[. !]*$/.test(q) ? 0
      : /^(?:2|second|the second(?: one)?|das zweite|die zweite|den zweiten|der zweite)[. !]*$/.test(q) ? 1 : undefined;
    let card = choice ?? (ordinal === undefined ? undefined : previousMenu?.[ordinal]);
    if (!card && previousMenu && /^(?:both(?: please| of them)?|beide(?: bitte)?|beides)[.! ]*$/.test(q)) {
      const descriptions=previousMenu.map(c=>label(c,en)+" – "+c.plainLanguage![en?"en":"de"]);
      const note=en ? "Ask the workshop team which dates or combination are possible for your class." : "Frag das Workshopteam, welche Termine oder Kombination für eure Klasse möglich sind.";
      return {mode:"library",topic:"workshops",answer:[...descriptions,note].join("\n\n"),
        sources:[{title:en?"School workshops at ForJu":"Schulworkshops bei ForJu",url:readerUrl(previousMenu[0].sourceUrl)}],
        suggestions:[en?"How do we sign up?":"Wie melde ich meine Klasse dafür an?"]};
    }
    if (!card && previousMenu && /^(?:yes|ja|not sure|weiss nicht)[. !]*$/.test(q)) {
      return {mode:"conversation",answer:prompt(previousMenu,en),sources:[],suggestions:previousMenu.map(c=>label(c,en))};
    }
    if (!card && follow && /^(?:(?:and|und) )?(?:what (?:would|do) we (?:do|learn)(?: there)?|was (?:machen|lernen) wir (?:da|dort)|worum geht es da)[?!. ]*$/.test(q)) {
      card=workshops.find(c=>c.id===prior);
    }
    if (!card) {
      const scores = new Map<Workshop,number>();
      for (const hit of index.search(q,{fuzzy:t=>t.length>=7 ? 1 : false})) {
        const example=examples[hit.id];
        if (!example.terms.every(t=>hit.terms.includes(t))) continue;
        scores.set(example.card,Math.max(scores.get(example.card)??0, example.terms.length));
      }
      const matches=[...scores.keys()].sort((a,b)=>(scores.get(b)??0)-(scores.get(a)??0));
      if (matches.length > 1) {
        const pair=workshops.filter(c=>matches.slice(0,2).includes(c));
        return {mode:"conversation",answer:prompt(pair,en),sources:[],suggestions:pair.map(c=>label(c,en))};
      }
      card=matches[0];
    }
    if (!card?.plainLanguage) return null;
    const selectedFromMenu = !!previousMenu && (choice !== undefined || ordinal !== undefined);
    const description = selectedFromMenu ? card.plainLanguage[en?"en":"de"] : en ? card.contentEn : card.content;
    const asksOrganizer = /^(?:wer (?:organisiert|veranstaltet|leitet|bietet)|who (?:organi[sz]es|runs|offers|leads))\b/.test(q);
    const contact = asksOrganizer && booking
      ? (en ? "ForJu offers these school workshops. " + booking.en : "ForJu bietet diese Schulworkshops an. " + booking.de) + "\n\n"
      : "";
    return {
      mode:"library",topic:card.id,
      answer:contact+label(card,en)+"\n\n"+description,
      sources:[{title:en?"School workshops at ForJu":"Schulworkshops bei ForJu",url:readerUrl(card.sourceUrl)}],
      suggestions:[
        en?"How do we sign up?":"Wie melde ich meine Klasse dafür an?",
        selectedFromMenu ? (en?"What would we do there?":"Was machen wir dort?") : (en?"Explain more simply":"Einfacher erklären"),
      ],
    };
  };
}
