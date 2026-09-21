export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 8;
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Source = { title: string; url: string };

export function parseChatRequest(body: unknown): { message: string; history: ChatMessage[] } {
  if (!body || typeof body !== "object") throw new Error("Ungültige Anfrage.");
  const { message, history = [] } = body as Record<string, unknown>;
  if (typeof message !== "string" || !message.trim()) throw new Error("Eine Nachricht ist erforderlich.");
  if (message.length > MAX_MESSAGE_LENGTH) throw new Error("Bitte beschränke deine Frage auf 2000 Zeichen.");
  if (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES) throw new Error("Der Gesprächsverlauf ist zu lang.");
  const validated = history.map((entry: unknown, index): ChatMessage => {
    if (!entry || typeof entry !== "object") throw new Error("Ungültiger Gesprächsverlauf.");
    const { role, content } = entry as Record<string, unknown>;
    if (role !== (index % 2 === 0 ? "user" : "assistant") || typeof content !== "string" || !content.trim() || content.length > 4000) {
      throw new Error("Ungültiger Gesprächsverlauf.");
    }
    return { role, content: content.trim() } as ChatMessage;
  });
  if (validated.length % 2 !== 0) throw new Error("Unvollständiger Gesprächsverlauf.");
  return { message: message.trim(), history: validated };
}

export function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\/wissen\/[a-z0-9-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function retrievalQuery(message: string, history: ChatMessage[]): string {
  // Include the most recent exchange so pronouns and short follow-ups retain context.
  return [...history.slice(-2).map((item) => item.content.slice(0, 1000)), message].join("\n");
}

export function selectKnowledge(matches: unknown) {
  if (!Array.isArray(matches)) return [];
  return matches.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.similarity !== "number" || !Number.isFinite(row.similarity) || row.similarity < 0.55 || typeof row.content !== "string" || !row.content.trim()) return [];
    return [{ title: typeof row.title === "string" ? row.title.slice(0, 200) : "ForJu Quelle", content: row.content.slice(0, 3000), url: safeSourceUrl(row.source_url), similarity: row.similarity }];
  }).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}
