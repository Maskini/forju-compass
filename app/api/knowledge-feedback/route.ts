import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { validateFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
// Small-instance protection; use shared rate limits before public deployment.
let windowStart = 0;
let received = 0;
export async function POST(request: Request) {
  let feedback;
  try { feedback = validateFeedback(await request.json()); }
  catch { return NextResponse.json({ error: "Bitte bestätige die Weitergabe einer gültigen Frage." }, { status: 400 }); }
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); received = 0; }
  if (++received > 20) return NextResponse.json({error: "Bitte versuche es später erneut."}, {status:429});
  if (process.env.NODE_ENV === "production" && !process.env.KNOWLEDGE_FEEDBACK_DIR) {
    return NextResponse.json({ error: "Die Wissensprüfung ist derzeit nicht eingerichtet. Bitte kontaktiere das ForJu-Team." }, { status: 503 });
  }
  try {
    const dir = process.env.KNOWLEDGE_FEEDBACK_DIR || path.join(process.cwd(), "work", "knowledge-feedback");
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify({id,...feedback,createdAt:new Date().toISOString()}), {flag:"wx",mode:0o600});
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Die Frage konnte nicht gespeichert werden." }, { status: 503 }); }
}
