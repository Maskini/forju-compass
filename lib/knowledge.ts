import MiniSearch from "minisearch";
import catalog from "@/knowledge/catalog.json";

// Public provenance is required even if a private entry is accidentally reintroduced.
export const knowledgeCatalog = catalog.filter(e => {
  try {
    const u = new URL(e.sourceUrl);
    return e.active && e.page === 0 && u.protocol === "https:" && !u.username && !u.password &&
      (["forju.at", "www.linkedin.com", "at.linkedin.com", "de.linkedin.com"].includes(u.hostname)) &&
      ["public-website", "public-social", "planned"].includes(e.kind);
  } catch { return false; }
});
export const kindLabels: Record<string, string> = {
  "public-social": "Öffentlicher Social-Media-Beitrag – Rückblick, keine aktuelle Verfügbarkeitszusage",
  "public-website": "Zusammenfassung der öffentlichen ForJu-Website",
  organization: "Selbstbeschreibung von ForJu (Stand 2026)",
  policy: "Politische Forderung – kein bestätigtes Angebot",
  planned: "Geplant – Verfügbarkeit nicht bestätigt",
  strategy: "Strategisches Ziel – keine Verfügbarkeitszusage",
  "external-evidence": "Externe Hintergrundangabe im Papier – nicht unabhängig aktualisiert",
};

function terms(text: string) {
  const ignored = new Set(["forju", "welche", "welchen", "welcher", "kann", "eine", "einen", "einer", "sind", "wird", "werden", "that", "what", "with", "does", "have", "this"]);
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])].filter(t => !ignored.has(t));
}

// High-confidence visitor intents complement term matching for short introductions
// and German compounds. More specific workshop, donation and job topics keep
// their ordinary relevance ranking.
export function visitorTopic(input: string) {
  const q=input.toLowerCase().normalize("NFKD").replace(/\p{M}/gu,"");
  // Distinguish people from physical resources, and money given from money needed.
  const wantsIntroduction = /introduc|put .{0,28}in touch|connect .{0,28}with|in kontakt bringen|kennenlernen|vermittel/.test(q);
  const mentionsPerson = /scientist|researcher|someone in a lab|expert|wissenschaftler|forscher|forschend|fachperson|biolog(?:ist|in|en|e)\b|chemist\b|chemiker|physicist\b|physiker/.test(q);
  const lookingForResearcher = /(?:need|looking for|speak (?:to|with)|talk (?:to|with)) (?:a (?:scientist|researcher)|someone who (?:studies|researches))\b|(?:suchen|brauchen) (?:jemanden,? (?:der|die) .{1,50}forscht|eine[n]? (?:forscher|wissenschaftler))/.test(q);
  const requestsContact = wantsIntroduction || /kontakt (?:herstellen|aufbauen)|in touch with/.test(q);
  if ((lookingForResearcher && !/\b(?:jobs?|vacanc(?:y|ies)|stelle|stellenangebot)\b/.test(q)) || (requestsContact && mentionsPerson)) return "connections";

  const gaveMoney = /donat|spende|uberwiesen|(?:gave|sent|transferred).{0,32}money/.test(q);
  const wantsProof = /receipt|acknowledg|confirmation|proof|nachweis|beleg|quittung|bestatigung/.test(q);
  if (gaveMoney && wantsProof) return "spenden-bestaetigung";

  const lacksMoney = /reicht nicht|nicht genug|zu wenig|geld fehlt|zu teuer|can.t afford|cannot afford|short of money|lack of funds|cost more than|cover (?:the |our )?(?:expense|cost)/.test(q);
  const projectExpense = /material|ausgaben|bauteil|projekt|versuch|experiment|equipment|supplies|project/.test(q);
  if (lacksMoney && projectExpense && !gaveMoney) return "finanzierung";
  const requestsAmount = /(?:need|needs|brauchen|benotigen)\b.{0,28}(?:\d[\d.,]*\s*(?:euros?|eur\b|€)|money|geld)/.test(q);
  if (requestsAmount && projectExpense && !gaveMoney) return "finanzierung";
  if (/notenschnitt|notendurchschnitt|gute noten|straight a(?:s|'s)\b|top grades|grades .{0,20}(?:join|participate)|grades (?:matter|count)/.test(q)) return "mission";
  if (/^(?:wer (?:ist|arbeitet) (?:bei forju|im (?:forju.)?team)|who (?:works at forju|is (?:on|in) (?:the |your )?team))[?!. ]*$/.test(q)) return "team";
  if (/mitglied werden|mitgliedschaft|beitreten|join forju|become a member|membership form/.test(q)) return "mitglied";
  if (/projektformular|project (?:submission |enquiry )?form/.test(q)) return "einreichen";
  if (/\bbudget\b|kostenscha?tz|kostenabschatz|(?:what|how much).{0,45}project.{0,24}cost/.test(q) && !gaveMoney) return "finanzierung";
  if (/submit.{0,22}(thesis|research project)|(?:abschlussarbeit|diplomarbeit|projekt).{0,20}einreichen/.test(q)) return "einreichen";
  if (/(?:air quality|luftqualitat|luftgute|co2|carbon dioxide)/.test(q) && /borrow|lend|measur|monitor|sensor|leih|mess/.test(q)) return "ressourcen";
  const needsSpace = /(?:suchen|brauchen|benotigen|fehlt|ausborgen).{0,55}\b(?:raum|labor)|(?:need|looking for|borrow|use) .{0,35}\b(?:lab|venue|space|room)\b/.test(q);
  if (needsSpace && !/stellenangebot|\bjobs?\b|workspace account/.test(q)) return "ressourcen";
  if (/\b(messgerat|messinstrument|mikroskop|microscope|lab space|laborraum|measuring instrument)/.test(q)) return "ressourcen";
  if (/\bsensors?\b|sensoren/.test(q) && /borrow|loan|available|verfug|leih|borgen/.test(q)) return "ressourcen";
  if (/fur wen.{0,16}forju|who is forju for|who (can|may) (take part|participate)|zielgruppe/.test(q)) return "mission";
  if (/projektidee|research idea|project idea/.test(q) && !/finanz|fund|geld|forder|donat/.test(q)) return "science-beratung";
  if (/fordermoglichkeit|funding|financial support|fund my|finanzier/.test(q) && !/workshop|spende|donat|seminar/.test(q)) return "finanzierung";
  if (/welche projekte gibt|what projects (does|are)|which projects/.test(q)) return "projekte";
  if (/ehrenamtlich engagieren|how can i (volunteer|get involved)/.test(q)) return "ehrenamt";
  const offersTime = /^(?:i|we|ich|wir)\b/.test(q) && /(?:spare|free) time|freizeit|(?:give|offer|contribute) .{0,20}hours/.test(q);
  if (offersTime && /organisation|organization|forju|lend a hand|mithelfen|mitarbeiten/.test(q)) return "ehrenamt";
  return null;
}

export function selectCatalogKnowledge(rows: unknown, question: string) {
  if (!Array.isArray(rows)) return [];
  const queryTerms = terms(question);
  const intent = visitorTopic(question);
  const active = new Map(knowledgeCatalog.map(e => [e.indexTitle, e]));
  const unique = new Map<string, { entry: typeof catalog[number]; similarity: number; score: number }>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || typeof row.title !== "string" || typeof row.similarity !== "number" || !Number.isFinite(row.similarity)) continue;
    const entry = active.get(row.title);
    if (!entry) continue; // Reject test data, unpublished rows and stale versions.
    const title = `${entry.title} ${entry.keywords}`.toLowerCase();
    const lexical = queryTerms.filter(t => title.includes(t)).length;
    if (row.similarity < 0.3 && lexical === 0) continue;
    // Local candidates are already ranked by bilingual text relevance. A second
    // substring bonus used to overturn that order (e.g. seminars → generic advice).
    const score = (entry.id === intent ? 0.8 : 0) + row.similarity;
    const previous = unique.get(entry.id);
    if (!previous || previous.score < score) unique.set(entry.id, { entry, similarity: row.similarity, score });
  }
  const ranked = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  // Keep the documented general contact available with its own citation.
  const contact = knowledgeCatalog.find(e => e.id === "kontakt" && e.active);
  if (ranked.length && contact && !ranked.some(item => item.entry.id === contact.id)) {
    ranked.push({ entry: contact, similarity: 0, score: 0 });
  }
  return ranked.map(({entry, similarity}, index) => ({
    id: entry.id,
    title: entry.page ? `${entry.title} — S. ${entry.page}` : entry.title,
    content: entry.content,
    contentEn: entry.contentEn,
    titleEn: entry.titleEn,
    kind: entry.kind,
    status: kindLabels[entry.kind],
    page: entry.page,
    sourceTitle: entry.sourceTitle,
    sourceYear: entry.sourceYear,
    lastReviewedAt: entry.lastReviewedAt,
    sourceUpdatedAt: entry.sourceUpdatedAt,
    reviewStatus: entry.reviewStatus,
    url: entry.sourceUrl,
    requestUrl: entry.requestUrl,
    similarity,
    citation: index + 1,
  }));
}

export function hasValidCitations(answer: string, count: number) {
  const citations = [...answer.matchAll(/\[Quelle\s+(\d+)\]/g)].map(m => Number(m[1]));
  return citations.length > 0 && citations.every(n => n >= 1 && n <= count);
}

export const answerFormat = {
  type: "json_schema" as const,
  name: "forju_grounded_answer",
  strict: true,
  schema: {
    type: "object", additionalProperties: false,
    properties: { paragraphs: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: { text: { type: "string" }, sources: { type: "array", items: { type: "integer" } } },
      required: ["text", "sources"],
    } }, readMore: { type: "array", items: { type: "integer" } } },
    required: ["paragraphs", "readMore"],
  },
};

export function parseGroundedAnswer(raw: string, sourceCount: number): { answer: string; readMore: number[] } | null {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.paragraphs) || data.paragraphs.length < 1 || data.paragraphs.length > 8) return null;
    const parts: string[] = [];
    const used = new Set<number>();
    for (const p of data.paragraphs) {
      if (!p || typeof p.text !== "string" || !p.text.trim() || !Array.isArray(p.sources) || p.sources.length < 1 || p.sources.some((n: unknown) => typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > sourceCount)) return null;
      if (/\[Quelle\s+\d+\]|https?:\/\//i.test(p.text)) return null;
      p.sources.forEach((n: number) => used.add(n));
      parts.push(p.text.trim());
    }
    const answer = parts.join("\n\n");
    if (!Array.isArray(data.readMore) || data.readMore.length > 3 || data.readMore.some((n: unknown) => typeof n !== "number" || !Number.isInteger(n) || !used.has(n))) return null;
    return answer.length <= 6000 ? { answer, readMore: [...new Set<number>(data.readMore)] } : null;
  } catch { return null; }
}

export function renderGroundedAnswer(raw: string, sourceCount: number) {
  return parseGroundedAnswer(raw, sourceCount)?.answer ?? null;
}

// Small public catalog: local keyword search also works when a provider is offline.
const catalogVocabulary = new Set(knowledgeCatalog.flatMap(entry =>
  (entry.keywords + " " + entry.titleEn + " " + entry.title).toLowerCase()
    .normalize("NFKD").replace(/\p{M}/gu, "").match(/[\p{L}]{6,}/gu) ?? []
));

// Repair a swapped pair only when the corrected word occurs in approved catalog labels.
function correctTransposition(word: string) {
  if (word.length < 6 || catalogVocabulary.has(word)) return word;
  for (let i = 1; i < word.length; i++) {
    const candidate = word.slice(0, i - 1) + word[i] + word[i - 1] + word.slice(i + 1);
    if (catalogVocabulary.has(candidate)) return candidate;
  }
  return word;
}

const normalizeSearch = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/ß/g, "ss");
const searchWords = (text: string) => normalizeSearch(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const stopWords = new Set((
  "the what where when how who does for and can you your are about have with this that there which will would could please want need from my our forju compass " +
  "did has had should was were some something been just many much get getting their they them help me any test tests " +
  "ich und wie kann wer ist der die das ein eine ihr mit bei gibt welche einen von fur mochte uns unser unsere unserem unseren bietet auch einem dazu gern " +
  "kannst konnt wolltest wollen machen aber nach du mein meine meinen meinem meiner dein deine deinen eure euere ihrer seinem seiner hat haben wird werden wurde war waren sind sein einer den dem des sich mir mich wir sie viele viel bitte etwas welche welcher welches konnte konnen wollt heute morgen gestern today tomorrow yesterday"
).split(/\s+/));
const searchIndex = knowledgeCatalog.map(entry => ({
  entry,
  labels: new Set(searchWords([entry.title, entry.titleEn, entry.keywords].join(" "))),
  body: new Set(searchWords(entry.content + " " + entry.contentEn)),
}));

// Reuse the installed MiniSearch engine for catalog passages, not just menu cues.
// Small fuzzy edits are evidence only when multiple meaningful words match, or
// when a long label itself matches. An audience word alone never selects an offer.
const catalogSearch = new MiniSearch({idField:"id",fields:["labels","body"],tokenize:searchWords,
  processTerm:term=>term.length>=3&&!stopWords.has(term)?term:null});
catalogSearch.addAll(knowledgeCatalog.map(e=>({id:e.id,labels:[e.title,e.titleEn,e.keywords].join(" "),body:e.content+" "+e.contentEn})));

export function localKnowledge(question: string) {
  // URL paths are not claims about a ForJu offer (e.g. an unrelated /host page).
  question = question.replace(/https?:\/\/[^\s]+/gi," ");
  const words = new Set(searchWords(question)
    .filter(word => word.length >= 3 && !stopWords.has(word))
    .map(correctTransposition));
  if (/\bIT\b/.test(question) || /\b(?:it[- ](?:jobs?|roles?|volunteer)|tech|technology|technology-related|developer|software|programmierung)\b/i.test(question)) {
    words.add("technologie");
  }
  if (/\b(fund|funding|financing|foerderung)\b/i.test(question)) words.add("finanzierung");
  const intent = visitorTopic(question);
  const asksAboutForJu = /^(what is|was ist|who is|wer ist) forju[?!. ]*$/i.test(question.trim());
  const scores = searchIndex.map(({entry}) => ({
    title: entry.indexTitle,
    score: entry.id === intent ? 14 : entry.id === "organisation" && asksAboutForJu ? 10 : 0,
    labelHit: false,
    bodyHits: 0,
  }));

  const genericSpaces = new Set(["room","rooms","space","raum","raume"]);
  const vagueSpace = (word:string) => words.size>4 && intent!=="ressourcen" && genericSpaces.has(word);
  const audienceOnly = new Set(["team","pupil","pupils","class","klasse","students","schuler","teachers","here"]);
  for (const word of words) {
    // An audience word also occurs in unrelated questions about train tickets
    // or sports. Require some evidence for what the visitor wants to do.
    if ((words.size > 1 && audienceOnly.has(word)) || vagueSpace(word)) continue;
    // Match actual words. For example, "game" inside "4Gamechangers" gives no
    // evidence about a football game. Allow longer prefixes in curated labels.
    const hits = searchIndex.map(({labels, body}) => {
      if (labels.has(word) || (word.length >= 7 && Array.from(labels).some(label => label.startsWith(word)))) return 2;
      return body.has(word) ? 1 : 0;
    });
    const weight = Math.log(1 + scores.length / (1 + hits.filter(Boolean).length));
    hits.forEach((hit, i) => {
      if (hit === 2) scores[i].labelHit = true;
      if (hit === 1) scores[i].bodyHits++;
      scores[i].score += hit * weight;
    });
  }
  const fuzzy = catalogSearch.search([...words].filter(w=>!audienceOnly.has(w)&&!vagueSpace(w)).join(" "),
    {boost:{labels:3,body:1},fuzzy:term=>term.length>=6?1:false});
  for(const hit of fuzzy){
    const terms=Object.keys(hit.match);
    const labelTerms=terms.filter(t=>hit.match[t].includes("labels"));
    if(terms.length<2 && !labelTerms.some(t=>t.length>=7))continue;
    const at=searchIndex.findIndex(({entry})=>entry.id===hit.id);
    if(at<0)continue;
    scores[at].score+=Math.log1p(hit.score)*1.4;
    if(labelTerms.length)scores[at].labelHit=true;
    else scores[at].bodyHits=Math.max(scores[at].bodyHits,terms.length);
  }
  return scores
    .filter((row, i) => row.score >= 2.4 && (row.labelHit || row.bodyHits >= 2 ||
      searchIndex[i].entry.id === intent || (asksAboutForJu && searchIndex[i].entry.id === "organisation")))
    .sort((a, b) => b.score - a.score)
    .map(row => ({title: row.title, similarity: Math.min(.99, .3 + row.score * .045)}));
}
