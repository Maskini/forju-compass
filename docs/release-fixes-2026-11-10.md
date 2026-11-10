# ForJu Compass: problems, fixes and remaining launch checks

This pass follows the assessment of `f9e4282`. Changes are local release work;
the public Render service and forju.at have not been changed. The appropriate
next step is a supervised pilot after the deployment checks below, not a claim
that every possible question is now reliable.

| Problem | Solution and present status |
| --- | --- |
| Known advisories in runtime dependencies | Updated Next.js to 16.4.6, matching eslint-config-next, Zod to 4.6.6, Sharp to 0.35.5 and source-map-js to 1.2.2. Production npm audit now reports zero known advisories. This is not proof of absence of all vulnerabilities. The dependency audit is now part of `npm run test:release`. |
| Allowance used up by worst-case reservations | Persist a reservation before each call, then settle it once against valid provider-reported standard-tier usage. Account for cached input and cache writes. Timeouts and ambiguous usage keep the full hold. No historical allowance was reset. |
| Silent change to weaker answers when AI fails | Both chat surfaces show a short notice that only general information is available, plus the existing team contact. Failure reason codes remain maintainer diagnostics. |
| Monthly volunteering availability ignored | Local fallback now compares the visitor's available time with the published role's weekly commitment, keeps corrections, and suggests asking about smaller tasks without inventing an opening. Added German introductory phrasing and English correction handling. Verified in AI mode and with no usable key. |
| Source ID mistaken for proof that a claim is true | Added targeted rejection of universal free/eligibility promises, currency amounts absent from the cited passage and common fabricated delivery claims. The earlier fake universal-free probe is now rejected. This remains partial protection: valid source IDs do not prove semantic support for every sentence. |
| Internal markers and unnecessarily complicated next steps | Removed a live-observed citation marker. Prompt now favours concise replies and sends service enquiries to the relevant service contact/form, instead of diverting them into the six-step project form. Some multi-constraint answers remain longer than the requested 60–100 words; that target is guidance, not a hard cap. |
| A working homepage mistaken for working AI/email | Added `/api/health`, a read-only readiness command and content-free outcome/timing logs. The endpoint distinguishes application liveness, budget/provider state and configured-but-unverified project mail. It makes no provider calls and never claims an inbox received a message. |
| Intermittent test-tool failures | Aligned the load test with the server's rate-limit clock. Reserved a fixed ZAP port inside the isolated test network after an ephemeral-port collision prevented the scanner from starting; disabled tool update/telemetry attempts. Failed-run evidence is retained. |
| Mail delivery confidence | One labelled synthetic report and one project were accepted by Resend for the existing approved iCloud inbox. Two distinct provider receipts were recorded. Inbox arrival remains unverified because the existing key is sending-only; permissions were not broadened. |
| Cold starts and ephemeral quota storage | Still a hosting issue. The free plan was not upgraded. Before unattended public AI use, select an agreed always-available host and persistent quota storage, or explicitly accept the free-tier limitations for a pilot. |
| Exposed temporary AI credential and real website integration | Rotate the key previously shared in chat before public rollout. Then verify the deployed AI configuration, actual ForJu embed and a physical phone keyboard. Local previews do not establish those facts. |

## Evidence and scope

Evidence is in [release-evidence/2026-11-10-fixes](release-evidence/2026-11-10-fixes).
Only synthetic conversations and operator test receipts are saved there. There
are no API keys, environment files or real visitor histories.

- `dependency-before.json` and `dependency-after.json`: registry advisory results.
- `live.json`, `holdout.json`, `browser.json`, `constraints-browser.json`: actual
  OpenAI answers through the local production `/api/chat` path. Source links
  were opened on ForJu; nothing was installed or submitted on forju.at.
- `fallback-browser.json` and screenshots: real missing-key recovery, desktop
  and phone viewport. The full suite also covers German/English notices in the
  standalone app and iframe; its notice-only flag is explicitly simulated.
- `mail-test-acceptance.json`, `mail-receipts.json`: real provider acceptance.
  `mail-delivery-status.json` records the denied read permission, not delivery.
- Failed initial answers/tests are retained in `fixes-first-live.json` and
  `fixes-second-live.json`. `holdout-before-marker-fix.json` retains the later
  `[fact]` leak found by inspecting the actual answer. The marker cleaner and
  regression check were extended, and the four-turn live case was rerun. These
  are regression examples, not an independent accuracy benchmark.
  Two negative assertions incorrectly matched quoted
  or negated claims; these were narrowed to affirmative claims. The leaked
  internal marker was an actual product defect and was fixed.
- The first mail test was rejected before sending because the local server was
  using the deployment's public origin. Setting its test-only
  `RENDER_EXTERNAL_URL=http://127.0.0.1:4199` corrected that configuration; the
  same idempotency keys were reused. No production origin check was weakened.
- `zap-port-collision.log` and `before-scanner-fix-status.tsv` preserve the
  scanner startup failure. It produced no scan result and was not counted as a
  pass. The final suite was rerun with the fixed proxy port. ZAP's
  [`-silent` option](https://www.zaproxy.org/docs/desktop/cmdline/) suppresses
  unsolicited tool requests in addition to Docker's network isolation.

Browser previews are on separate origins, with desktop and mobile viewports.
They are not the actual ForJu installation or a physical phone. Local inbox
fixtures test failure/retry and duplicate prevention; those results are separate
from the two real accepted emails. The full offline suite uses no model calls
and blocks external test traffic. Registry metadata/toolchain downloads happen
before those isolated visitor tests.

## Final verification

Run `20261110T140658Z-final-70714` completed all 16 stages successfully.

- Production build, lint (zero errors; ten existing warnings), approved-catalog
  checks and 131 unit tests passed.
- Promptfoo: 128/128 local-mode HTTP cases passed.
- Playwright: 240/240 passed across Chromium, Firefox, WebKit and mobile WebKit;
  no failures, retries reported as flaky, or skipped tests. Includes standalone
  and separate-origin widget, project recovery, local report failure/retry,
  keyboard/focus and axe checks.
- k6: 13 accepted chat requests, 14 expected rate-limit responses, zero unexpected
  responses; recovery after the actual limit reset passed. Normal local-mode
  p95 was 181.7 ms; accepted burst p95 was
  82.7 ms. These are not AI latency or capacity results.
- ZAP: scan completed; two reviewed warning categories remain (inline CSS in CSP
  and HTML anti-CSRF-token detection on the JSON-only reporting path). Targeted
  origin/content-type checks passed. No new high or unreviewed medium finding;
  this was a passive baseline, not a penetration test.
  Three informational categories were reviewed: a harmless layout comment
  containing “from”, JavaScript-app detection, and the allowlisted `lang`
  attribute. A real Chromium check of malicious language parameters on both
  preview and embed confirmed no injected handler or execution.
- No unintended server egress was observed in the isolated suite.
- Twelve selected real AI API responses plus eight real browser answers were
  checked. The direct-response sample took 2.3–6.1 seconds.
  These small selected regressions do not establish a population accuracy rate.
- All 48 live trial calls, including earlier attempts and reruns, settled in
  the usage ledger: $0.090202, below the $0.15 trial cap. No invoice was checked.
- One real report and one real project were accepted by Resend. Inbox arrival
  remains unverified. Four fixture deliveries and their retries are simulated
  and are not evidence of live delivery.

Full stage/journey details: [suite summary](release-evidence/2026-11-10-fixes/suite-summary.md).
Machine-readable results: [verification.json](release-evidence/2026-11-10-fixes/verification.json).
The local preview at `http://127.0.0.1:4197/preview?lang=de` uses AI and the existing
private mail settings, with the same isolated $0.15 trial allowance. The public
Render app remains unchanged.

## Repeat and release

```sh
npm ci
npm run test:release
```

The command includes dependency audit, unit/source/catalog checks, lint,
production build, Promptfoo, Playwright/axe, local mail fixtures, security checks,
k6, ZAP and server-egress verification. See the evidence's final run summary for
counts and timings. Live AI checks are explicit opt-in commands in
[ai-conversation.md](ai-conversation.md); they use the existing OpenAI account
and may consume credits. A new isolated trial was capped at $0.15 for this pass;
the exhausted earlier trial ledger was left untouched.

Before public rollout:

1. Replace the exposed test key privately, set the intended AI mode and reviewed
   budget on the existing deployment, then deploy the tested commit.
2. Resolve cold starts/persistent quota storage within the agreed hosting budget.
   Actual traffic is unknown; the local load test cannot certify capacity for
   an unspecified number of visitors or measure live AI concurrency.
3. Check the two labelled messages in `adam.maskini@icloud.com`. Confirm the
   eventual organisation-owned recipient and who handles it. Sending to a ForJu
   address through the current sandbox sender still requires an approved sender.
4. Verify one DE/EN conversation, its source and a form on the actual embedded
   website and a physical phone. Confirm ForJu's visitor privacy wording covers
   the configured processing and temporary tab recovery.

For an AI-only rollback, set `COMPASS_LOCAL_ONLY=true` and restart. Keep the
security dependency patches: rolling back to the previous vulnerable package
lock is not the recommended fallback. Normal code rollback remains available
through the existing deployment process.

## Dependencies, data and external references

No new service or runtime library was added. Existing packages were upgraded;
their package licence files remain in the distributions. Next.js, Zod and
eslint-config-next are MIT; Sharp is Apache-2.0; source-map-js is BSD-3-Clause.
OpenAI receives the question and up to four recent exchanges in AI mode;
`store:false` does not mean zero provider retention. The existing Resend service
received only the two authorised synthetic email tests in this pass. Local
release tests send no visitor payloads to external services. No subscription or
hosting plan was changed.

Published advisory examples: [Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
Pricing references: [model](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
and [cache accounting](https://developers.openai.com/api/docs/guides/prompt-caching).
Hosting limitations: [Render free services](https://render.com/docs/free).
