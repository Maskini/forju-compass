# ForJu Compass release decision · 6 November 2026

**Hold public installation. The catalog-only candidate is ready for ForJu staging.** The local receiver proves that the app can submit and retry safely. The public service still needs an authorized project sender, and the real feedback destination and host installation need validation. A green local suite is insufficient to promise those services to visitors.

Tested candidate: `996f9f1`. The release branch is `release/visitor-audit-20261106`. The audit did not publish a deployment or send real mail.

| Critical journey | Local production build | Public launch |
|---|---|---|
| German teacher asks about a workshop, follows up and opens the supporting page | **PASS** on the standalone homepage and separate-origin widget. The answer named Anja Hofer, included her published address, and opened the expected German workshop URL. The destination was served by an explicitly offline fixture. | Actual ForJu host journey untested. |
| Bilingual answers and citations | **PASS, 19/19 cases (26 turns)**. Deterministic fact and exact-source checks against separately reviewed public pages. | AI-backed answers untested. |
| Project idea → six steps → edit → close → resume → copy | **PASS**. The final text contained the correction, omitted the skipped timing, and pasted exactly via the device copy command. A second browser session had empty fields. Send stays the primary action. | **Blocked for submission** pending an authorized production sender. |
| Project receipt | **PASS** for the disabled path. A separately configured instance refused an unconfirmed request, returned an error after a lost acknowledgement, and accepted a retry with one exact draft in the simulated inbox. | Production acceptance and inbox delivery untested. |
| Wrong-answer report → opt in or out → fail → retry → return | **PASS**. Desktop and phone-sized journeys exercised the actual feedback API and SDK. The receiver stored one message for two attempts. Opt-out excluded the exchange; opt-in included just the chosen pair. No unrelated turn or reply address appeared. Focus returned to the original answer. | **Untested** in the designated real inbox. |
| Embed permissions, privacy and accessibility | **PASS**. The permitted local HTTPS host displayed the real widget. The denied host could not. HTML-like visitor text stayed inert. Tested keyboard focus, small-screen action reachability and axe WCAG A/AA checks. | ForJu’s actual CMS, headers, physical phone and keyboard remain live checks. |
| Security and traffic | **PASS with two reviewed scanner warnings**. Read the limits and scan findings below. | Render cold-start time, production burst capacity and broader security coverage untested. |

## Evidence and fixes

* First 12 development questions: 10 passed the original deterministic rubric. Direct sponsorship incorrectly opened project submission. An unspecified “Can you help with that?” picked funding. The fixes route sponsorship to financial support and ask for the visitor’s goal when there is no topic. Manual review strengthened two weak checks: the typo question asked **who** offers a workshop, and an answer about eligibility must address eligibility itself.
* Seven questions were withheld across successive rounds. On first exposure, four passed. Three missed useful routes: the booking contact after an Instagram workshop, the named partnership contact after an equipment offer, and a search for funding partners that was mistaken for donating. All seven are now regression cases. [First-attempt answers and grades](release-evidence/2026-11-06/first-attempts.json). The final percentage includes these repaired cases and is not an estimate of accuracy on arbitrary new questions.
* A real cross-origin project dialog lost focus as the host expanded it. The iframe now restores focus after the host confirms layout. axe exposed insufficient contrast in report text and a launcher whose accessible name omitted its visible hint. The review also lacked a way to copy the complete edited project. A selectable final text view now supports copying without leaving the form.
* Chat and search previously returned HTTP 200 for a 33.5 KB chunked JSON request that bypassed the Content-Length check. Both endpoints now cap bytes while reading. Forged report/submission origins, form-encoded feedback, unsafe markup, malformed history and oversized inputs are covered. Early ZAP runs also found missing nosniff, a framework identification header and an overly broad CSP. The candidate adds nosniff, removes the banner, and uses a fresh script nonce on rendered pages.
* Feedback and project retries were exercised with **lost acknowledgements**, not just errors before sending. The SDK used a loopback mail receiver and a synthetic key. Network isolation was enforced with Docker `--network none`; scanners and evaluators shared only the test container’s loopback. No real visitor data, paid model calls or live mail were used. Public-source review and fetching tool images were separate preparation steps.
* Human review: the workshop article’s funding statement is dated November 2024. The reply correctly asks visitors to confirm current costs. A human content owner would need to confirm any stronger eligibility or price promise. A request for a sensor is supported; device stock and dates must come from the partner. Semantic entailment of untested answers and user satisfaction cannot be inferred from pattern matches.

## Measurements and scope

The final build and lint completed and all 72 unit tests passed. Playwright passed all 68 runs without retries, skips or flaky outcomes: 20 each in desktop Chromium, Firefox and WebKit, plus eight in mobile WebKit emulation. Eight retry journeys each produced exactly one local feedback receipt. [Per-engine evidence](release-evidence/2026-11-06/summary.md) · [Final API answers and citations](release-evidence/2026-11-06/final-answers.jsonl).

k6 measured **17.1 ms p95** for five spaced successful chat requests and **48.4 ms p95** for the 20-request burst. Within the burst, accepted p95 was 24.5 ms and limited p95 was 49.3 ms. Across all phases there were **13 accepted, 14 expected HTTP 429, and 0 unexpected responses**. The per-visitor and shared limits were measured separately. Waiting through the real Retry-After interval restored service without resetting the database. These are small-sample, warm, local timings. [k6 measurements](release-evidence/2026-11-06/load.json).

ZAP passively scanned 42 local URLs, including the widget and embed. There were no high alerts. Two medium findings were reviewed: the UI permits inline **styles**, and the static feedback form has no HTML CSRF token. The application rejects cross-origin JSON and form-encoded posts (403/415), and script execution uses a nonce. The gate accepts the token warning only for that specific form. Informational findings and full counts are recorded. This is a passive baseline, not a comprehensive penetration test. [ZAP findings](release-evidence/2026-11-06/zap-findings.log).

No local generative model was available (no local Ollama/LM Studio service or installed Docker model was found). DeepEval was therefore **untested**. AI-backed retrieval, remote generation, its citations, egress and costs are outside this catalog-only run.

## Read-only live observations

The deployed Render status endpoint returned HTTP 200 and reported direct project sending disabled. Neither the German nor English ForJu homepage showed the Compass script, launcher or iframe during inspection. No live submission was attempted. [Live observations](release-evidence/2026-11-06/live-readonly.json).

## Smallest live checks

1. Use a staging installation on ForJu’s actual website, with its real origin, CSP and site-wide embed snippet. Open it by keyboard, ask the German teacher follow-up, open the citation and resume the exchange. Repeat on a physical phone with its keyboard visible. Check initial load after the hosting service has been idle.
2. Confirm the intended feedback inbox and authorized sender. The checked-in Render demo configuration routes feedback to the iCloud account owner; the production mail policy permits `adam.maskini@forju.at`. Switch out of demo mode only with the approved settings. From staging, send one explicitly authorized, labeled report and one project, and reconcile server acceptance with **actual inbox receipt**. Project email needs a verified sender usable by the configured key.
3. Keep `COMPASS_LOCAL_ONLY=true` for this release. Check that the default global quota of 12 requests/minute and 300/day fits the anticipated audience. A larger rollout or an AI-backed launch needs separate evidence before making the same release decision.

## Repeat

From the repository root run `npm run test:release`. The full run prints its evidence directory. Public tool installation needs internet and local Docker. The test phase runs offline. See the [suite instructions](../tools/release/README.md), [independent fact cards](../tools/release/sources.md), and [recorded evidence](release-evidence/2026-11-06/summary.md).
