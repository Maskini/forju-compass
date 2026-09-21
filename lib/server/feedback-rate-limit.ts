import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

export const FEEDBACK_WINDOW_MS = 10 * 60 * 1000;
export function createFeedbackLimiter() {
  const buckets = new Map<string, { count: number; expires: number }>();
  return (key: string, now = Date.now()) => {
    for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
    let bucket = buckets.get(key);
    if (!bucket) {
      // Fail closed instead of evicting live limits when the map is full.
      if (buckets.size >= 10000) return { allowed: false, retryAfter: 600 };
      bucket = { count: 0, expires: now + FEEDBACK_WINDOW_MS }; buckets.set(key, bucket);
    }
    const allowed = bucket.count < 5;
    if (allowed) bucket.count++;
    return { allowed, retryAfter: Math.max(1, Math.ceil((bucket.expires - now) / 1000)) };
  };
}
const salt = randomBytes(32);
export function feedbackClientKey(request: Request) {
  // Set only when the ingress proxy overwrites this header and direct access is blocked.
  const header = process.env.FEEDBACK_IP_HEADER?.trim().toLowerCase();
  const ip = header ? request.headers.get(header)?.split(",")[0].trim() : undefined;
  return createHmac("sha256", salt).update(ip && isIP(ip) ? ip : "shared-unidentified-client").digest("hex");
}
export const limitFeedback = createFeedbackLimiter();
