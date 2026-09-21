import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { feedbackSchema, type FeedbackReport } from "../feedback-validation";
import { FeedbackConfigurationError } from "./feedback-email";

export const MAX_FEEDBACK_BYTES = 16 * 1024;
const errorMessage = "Das Feedback konnte nicht gesendet werden. Bitte versuche es erneut.";
const json = (body: object, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });
class BodyError extends Error { constructor(public status: number) { super("invalid_body"); } }
async function readBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_FEEDBACK_BYTES) throw new BodyError(413);
  if (!request.body) throw new BodyError(400);
  const reader = request.body.getReader();
  let bytes = 0, text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_FEEDBACK_BYTES) throw new BodyError(413);
          text += decoder.decode(value, { stream: true });
        }
        return JSON.parse(text + decoder.decode()) as unknown;
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BodyError(408)), 5000); }),
    ]);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) throw new BodyError(400);
    throw error;
  } finally { if (timer) clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
export function createFeedbackHandler(deps: {
  send: (report: FeedbackReport, key: string) => Promise<string>;
  limit: (request: Request) => { allowed: boolean; retryAfter: number };
  log?: (event: string, requestId: string) => void;
}) {
  return async (request: Request) => {
    const requestId = randomUUID();
    try {
      const origin = request.headers.get("origin");
      if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: errorMessage }, 403);
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: errorMessage }, 415);
      const raw = await readBody(request);
      const parsed = feedbackSchema.safeParse(raw);
      if (!parsed.success) return json({ error: errorMessage, code: "invalid_feedback" }, 400);
      if (parsed.data.honeypot) return json({ success: true });
      const key = request.headers.get("idempotency-key") || randomUUID();
      if (!z.uuid().safeParse(key).success) return json({ error: errorMessage }, 400);
      const limit = deps.limit(request);
      if (!limit.allowed) return json({ error: errorMessage, code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfter) });
      const digest = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
      await deps.send(parsed.data, `feedback/${key}/${digest}`);
      deps.log?.("accepted", requestId);
      return json({ success: true });
    } catch (error) {
      if (error instanceof BodyError) return json({ error: errorMessage }, error.status);
      deps.log?.(error instanceof FeedbackConfigurationError ? "configuration_missing" : "delivery_failed", requestId);
      return json({ error: errorMessage }, error instanceof FeedbackConfigurationError ? 503 : 502);
    }
  };
}
