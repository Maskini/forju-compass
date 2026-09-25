export function validateFeedback(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Ungültige Rückmeldung.");
  const row = body as Record<string, unknown>;
  if (row.consent !== true || typeof row.question !== "string" || !row.question.trim() || row.question.length > 2000) throw new Error("Bitte bestätige die Weitergabe einer Frage mit höchstens 2000 Zeichen.");
  return { question: row.question.trim(), reason: "knowledge-gap", status: "pending-review" };
}
