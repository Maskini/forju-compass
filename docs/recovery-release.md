# Recovery and mail diagnostics · 9 November 2026

This pass builds on `2ea86930e7276886538148a9a0ba456724d4cafd`. It keeps the existing Render preview, catalog-only mode, email recipient and hosting plan. No new package, model, paid call or service was added. The official ForJu website is untouched.

## What changed

- The shared chat hook and six-step project form recover from bounded, validated sessionStorage for 30 minutes after their last change. The conversation, unsent text, project fields and current step recover; the widget opens closed at its default position. A collapsed notice explains recovery in German and English.
- Reloading never posts a question or sends a project. A question interrupted by reload returns to the input for an explicit retry. Identical project retries retain their provider idempotency key, including after refresh. An accepted, unchanged project remains marked as sent.
- Trash clears the conversation and project recovery. A late send response cannot restore data after that component has been cleared. Expired, corrupted or oversized records are discarded; blocked browser storage falls back to memory.
- Fixed a Firefox keyboard-focus race after cancelling the trash dialog. The host waits for the native dialog to settle and asks the iframe whether focus is still unclaimed before returning it to the trash button. Typing in the composer takes precedence over a late acknowledgement.
- Both production mail adapters record only kind, accepted state, provider ID and timestamp after provider acceptance. No content, address or credential is included. The read-only maintainer command in [deployment.md](deployment.md#trace-an-email-without-sending-another-one) can inspect an existing receipt with an already-authorized key, or directs the maintainer to the signed-in Resend dashboard if the key is sending-only.

## Validation scope

The production build and browser journeys run in a local Docker container with external networking disabled, synthetic questions and a loopback mail receiver. Chromium, Firefox, WebKit and a 390 × 844 mobile WebKit viewport exercise German and English recovery, prefill/edit/resume, send failure/retry, accepted receipts, session isolation, clearing and delayed-response races. Existing reporting, keyboard, scrolling, embed-origin and accessibility checks run alongside the new cases. A simulated receiver is not a real inbox.

The first complete browser pass found two Firefox cancel-focus failures (178 passed, 2 failed). The fix then passed 15 repeated focused checks. A later full run passed 182 checks but recorded two WebKit proxy-teardown errors after the page-return assertions. The fixture now drains in-flight proxy handlers before disposing the browser context. A test-only synthetic MessageEvent constructor was replaced with a real cross-frame postMessage because Firefox rejected the simulated WindowProxy; that fixture error did not affect the product.

**Final result: 94 unit tests and all 184 browser checks passed (54 Chromium, 54 Firefox, 54 WebKit, 22 mobile WebKit), without retries, skips or flaky results.** The production build passed; lint has no errors and retains 10 existing warnings. The targeted security script passed, and the server observer recorded no unintended egress. Ten repeated WebKit teardown checks and 15 repeated Firefox focus checks passed. The production mail adapters accepted four simulated logical messages across eight attempts, with one receipt per message, for German and English project/report flows.

Results and candidate hashes are recorded under [recovery evidence](release-evidence/2026-11-09-recovery/). Repeat the complete existing offline release gate with:

```sh
npm run test:release
```

This command now includes the recovery and mail-diagnostics regressions. Promptfoo, k6 and ZAP results from the preceding release remain in [release-audit.md](release-audit.md); those stages were not rerun for this browser-state/receipt pass. No AI-backed mode was tested.

## Limits and release decision

Suitable for private testing of the existing catalog-only preview once its deployment is verified. This is not evidence of installation on the official ForJu site or physical-phone keyboard behavior. Temporary iframe storage can be blocked, tabs can be discarded, and browser session restore or tab duplication may copy temporary storage; recovery is not a durable backup or identity boundary. Clearing and expiry remain important. Report fields still use the existing in-memory retry behavior and do not survive reload. The host privacy information must describe temporary browser storage before installation.

No real email was sent in this pass and no live Resend status lookup or inbox delivery was verified. The intended iCloud recipient is unchanged. Existing Render free-tier cold starts remain possible. No new service or dependency changes the monetary cost.

## Update and rollback

Use the existing documented GitHub-to-Render deployment procedure. For an immediate rollback in Render, select the previously live deployment `dep-dbp123u417fc73fefjsg` (commit `2ea8693`). For a lasting rollback, revert this release commit and push the revert to main. Do not reset the canonical laptop checkout, which contains other work. The previous version ignores recovery records; they remain bounded by their expiry when this version runs again and can be cleared through the browser's site data controls.
