import catalog from "@/knowledge/catalog.json";

export const knowledgeCatalog = catalog;
export const kindLabels: Record<string, string> = {
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

export function selectCatalogKnowledge(rows: unknown, question: string) {
  if (!Array.isArray(rows)) return [];
  const queryTerms = terms(question);
  const active = new Map(catalog.filter(e => e.active).map(e => [e.indexTitle, e]));
  const unique = new Map<string, { entry: typeof catalog[number]; similarity: number; score: number }>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || typeof row.title !== "string" || typeof row.similarity !== "number" || !Number.isFinite(row.similarity)) continue;
    const entry = active.get(row.title);
    if (!entry) continue; // Reject test data, unpublished rows and stale versions.
    const title = `${entry.title} ${entry.keywords}`.toLowerCase();
    const lexical = queryTerms.filter(t => title.includes(t)).length;
    if (row.similarity < 0.3 && lexical === 0) continue;
    const score = row.similarity + Math.min(lexical, 4) * 0.08;
    const previous = unique.get(entry.id);
    if (!previous || previous.score < score) unique.set(entry.id, { entry, similarity: row.similarity, score });
  }
  const ranked = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  // Keep the documented general contact available with its own citation.
  const contact = catalog.find(e => e.id === "kontakt" && e.active);
  if (ranked.length && contact && !ranked.some(item => item.entry.id === contact.id)) {
    ranked.push({ entry: contact, similarity: 0, score: 0 });
  }
  return ranked.map(({entry, similarity}, index) => ({
    id: entry.id,
    title: entry.page ? `${entry.title} — S. ${entry.page}` : entry.title,
    content: entry.content,
    kind: entry.kind,
    status: kindLabels[entry.kind],
    page: entry.page,
    sourceTitle: entry.sourceTitle,
    sourceYear: entry.sourceYear,
    reviewStatus: entry.reviewStatus,
    url: `/wissen/${entry.id}`,
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
    } } },
    required: ["paragraphs"],
  },
};

export function renderGroundedAnswer(raw: string, sourceCount: number): string | null {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.paragraphs) || data.paragraphs.length < 1 || data.paragraphs.length > 8) return null;
    const parts: string[] = [];
    for (const p of data.paragraphs) {
      if (!p || typeof p.text !== "string" || !p.text.trim() || !Array.isArray(p.sources) || p.sources.length < 1 || p.sources.some((n: unknown) => typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > sourceCount)) return null;
      parts.push(`${p.text.trim()} ${[...new Set<number>(p.sources)].map(n => `[Quelle ${n}]`).join(" ")}`);
    }
    const answer = parts.join("\n\n");
    return answer.length <= 6000 ? answer : null;
  } catch { return null; }
}
