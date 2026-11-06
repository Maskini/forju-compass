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
function visitorTopic(input: string) {
  const q=input.toLowerCase().normalize("NFKD").replace(/\p{M}/gu,"");
  if (/\b(messgerat|messinstrument|mikroskop|microscope|lab space|laborraum|measuring instrument)/.test(q)) return "ressourcen";
  if (/fur wen.{0,16}forju|who is forju for|who (can|may) (take part|participate)|zielgruppe/.test(q)) return "mission";
  if (/projektidee|research idea|project idea/.test(q) && !/finanz|fund|geld|forder|donat/.test(q)) return "science-beratung";
  if (/fordermoglichkeit|funding|financial support|fund my|finanzier/.test(q) && !/workshop|spende|donat|seminar/.test(q)) return "finanzierung";
  if (/welche projekte gibt|what projects (does|are)|which projects/.test(q)) return "projekte";
  if (/ehrenamtlich engagieren|how can i (volunteer|get involved)/.test(q)) return "ehrenamt";
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
    const score = (entry.id === intent ? 0.8 : 0) + row.similarity + Math.min(lexical, 4) * 0.08;
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

export function localKnowledge(question: string) {
  const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/\p{M}/gu,"");
  const ignore = new Set("the what where when how who does for and can you your are about have with this that there which will would could please want need from my our forju compass ich und wie kann wer ist der die das ein eine ihr mit bei gibt welche einen von fur mochte uns unser unsere unserem unseren bietet auch einem dazu gern".split(" "));
  const words = [...new Set(normalize(question).match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(w => !ignore.has(w)).map(correctTransposition);
  if (/\b(it|tech|technology|technology-related|developer|software|programmierung)\b/i.test(question)) words.push("technologie");
  if (/\b(fund|funding|financing|foerderung)\b/i.test(question)) words.push("finanzierung");
  const rows = knowledgeCatalog.map(e => ({e, tags:normalize([e.title,e.titleEn,e.keywords].join(" ")), body:normalize(e.content+" "+e.contentEn)}));
  const scores = rows.map(r => ({title:r.e.indexTitle,score:0}));
  for (const word of words) {
    const hits = rows.map(r => r.tags.includes(word) ? 2 : r.body.includes(word) ? 1 : 0);
    const idf = Math.log(1 + rows.length / (1 + hits.filter(Boolean).length));
    hits.forEach((hit,i) => { scores[i].score += hit * idf; });
  }
  if (/^(what is|was ist|who is|wer ist) forju[?!. ]*$/i.test(question.trim())) {
    const org=scores.find(s=>s.title===knowledgeCatalog.find(e=>e.id==="organisation")?.indexTitle); if(org) org.score+=10;
  }
  const intent=visitorTopic(question);
  if(intent){const target=scores.find(row=>row.title===knowledgeCatalog.find(e=>e.id===intent)?.indexTitle);if(target)target.score+=14;}
  return scores.filter(s=>s.score>=2.4).sort((a,b)=>b.score-a.score).map(s=>({title:s.title,similarity:Math.min(.99,.3+s.score*.045)}));
}
