import "server-only";
import { supabase } from "@/lib/supabase";
import { knowledgeCatalog } from "@/lib/knowledge";

let cached: { expires: number; rows: { title: string; vector: number[] }[] } | undefined;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

// Filter at the database boundary: internal documents never enter retrieval/context.
export async function retrievePublicKnowledge(query: number[]) {
  if (!cached || cached.expires <= Date.now()) {
    const titles = knowledgeCatalog.map(e => e.indexTitle);
    const rows: { title: string; vector: number[] }[] = [];
    for (let i = 0; i < titles.length; i += 80) {
      const batch = titles.slice(i, i + 80);
      const { data, error } = await supabase.from("documents").select("title,embedding").in("title", batch);
      if (error) throw new Error("Public knowledge retrieval unavailable");
      for (const row of data ?? []) {
        if (!batch.includes(row.title)) continue;
        try {
          const vector = typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding;
          if (Array.isArray(vector) && vector.length && vector.every(n => typeof n === "number" && Number.isFinite(n))) rows.push({ title: row.title, vector });
        } catch { /* Ignore malformed vectors. */ }
      }
    }
    cached = { expires: Date.now() + 60000, rows };
  }
  const scores = new Map(cached.rows.map(row => [row.title, cosineSimilarity(query, row.vector)]));
  // New public entries remain available through lexical matching until embedded.
  return knowledgeCatalog.map(entry => ({ title: entry.indexTitle, similarity: scores.get(entry.indexTitle) ?? 0 }));
}
