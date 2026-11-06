import "server-only";
import { mkdirSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { openQuota } from "./quota.mjs";
let store: ReturnType<typeof openQuota> | undefined;
export function takeAiRequest(request: Request) {
  try {
    if(!store) {
      // The quota file is created at runtime. Its directory is not a build input.
      const path=resolve(/* turbopackIgnore: true */ process.cwd(), process.env.COMPASS_QUOTA_DB || "work/ai-quota.sqlite");
      mkdirSync(dirname(path),{recursive:true,mode:0o700});
      store=openQuota(path);
    }
    // Only configure a client-IP header overwritten by your trusted ingress.
    const header=process.env.COMPASS_CLIENT_IP_HEADER;
    return store.take(header ? request.headers.get(header)?.trim() : "");
  } catch { return 60; } // A broken quota store must not allow unlimited paid calls.
}
