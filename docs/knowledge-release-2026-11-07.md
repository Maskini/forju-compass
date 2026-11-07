# Compass knowledge and open-source release pass — 7 November 2026

**Decision: improved local-only release candidate; not an unconditional production
approval.** The working app has better bilingual matching, safer topic selection
and a repeatable public-source review process. No new paid calls, external
services or production model were added. The public Render deployment and the
actual ForJu installation were not changed in this pass. This report covers the
open-source work; the subsequently requested interface changes are a separate
next pass.

## What changed and why

| Observed failure | Change in the live answer path |
|---|---|
| Technical project help, budget help and official form questions reached the wrong page | Reused MiniSearch for the main bilingual catalog, added source-backed everyday terms and explicit intent distinctions. |
| A second keyword bonus reversed a correct search result, selecting generic advice instead of seminars | Removed that redundant re-ranking; preserved the already ranked candidates. |
| “Und was kostet das pro Woche?” and “How can I arrange it for my class?” lost their subject | Resolved bounded reference questions against the current offer; kept the specific workshop and its real booking contact. |
| German compounds for specialist devices/rooms were missed | Added public-source wording and visitor equivalents to the equipment record. A device request still does not prove stock, price or availability. |
| A flight request and pasted software-room instructions could match unrelated offers | Removed grammatical filler and URL-path words from search evidence; a generic “room” in a long unrelated message no longer establishes a physical-space request. |
| Updates were flat, German-only extraction with manual content-only hashes | Added Mozilla Readability plus jsdom in maintainer-only tools; bilingual exact-URL refresh, structured passages, change/removal warnings and explicit per-record review/versioning. |
| Escape could close the iframe but lose keyboard focus in Firefox | Restore focus to the launcher after the dialog's close event, while preserving focus during layout-mode changes. |

A request such as `Wir brauchen Messgeräte für unser Schulprojekt` goes through
`POST /api/chat` → request validation → conversational/detail handlers →
`localKnowledge` → `selectCatalogKnowledge` → the active `ressourcen` record in
`knowledge/catalog.json` → `libraryReply`, with its exact resource and enquiry
links. `COMPASS_LOCAL_ONLY=true` takes this path even if an API key exists.
No Supabase import is needed to make these edits effective.

The optional external mode (`COMPASS_LOCAL_ONLY=false` **and** a key) embeds the
query using OpenAI, retrieves only exact active public catalog version titles
from Supabase, then generates a structured response from catalog text with
OpenAI (`store:false`). Database-supplied text and old/internal version titles do
not become evidence. Invalid retrieval/generation falls back to the local
catalog. That external mode was tested with stubs only, not live, and is not the
zero-cost launch recommendation.

## Measured results

The first 14 scenarios were specified from public ForJu pages before edits and
run against a real production build over `/api/chat`. Assertions check the
specific topic, required facts, forbidden inventions and the exact supporting
page. They are synthetic regressions, not a real-user accuracy estimate.

| Set | First run | After repair |
|---|---:|---:|
| Original bilingual baseline | 9/14 | 14/14 |
| Six reserved questions | 2/6 | 6/6 |
| Two additional unfamiliar questions | 1/2 | 2/2 |
| User’s unrelated software-room example | Previously wrong in the screenshot | Correct clarification; no unrelated citation |

All 23 new scenarios now pass. The first reserved runs exposed real weaknesses;
those examples are now known regressions and must not be presented as a blind
100% result. See [raw before/after and initial failures](evidence/knowledge-2026-11-07/).

The release gate additionally includes the previous answer cases, real Chromium,
Firefox and WebKit desktop journeys and mobile WebKit emulation, separate-origin
embedding, project prefill/edit/resume, independent visitor sessions, reporting
failure/retry, exactly one receipt in a **local simulated inbox**, keyboard/focus,
axe-core, hostile input, embed restrictions, quota recovery, k6 and passive ZAP.
The final run, `20261107T085919Z-final-88307`, exited successfully. See the
[machine-readable results](evidence/knowledge-2026-11-07/release-results.json),
[individual visitor journeys](evidence/knowledge-2026-11-07/release-summary.md)
and [all answer transcripts](evidence/knowledge-2026-11-07/release-answers.jsonl).
Automated citation checks verify destinations and expected claims;
manual reading of the live pages supplied the reference facts. In the offline
browser suite, source-page destinations are labeled fixtures, not live ForJu.

| Critical check | Final result |
|---|---|
| Production build, TypeScript, lint | PASS; 0 lint errors, 10 existing warnings |
| Core unit / source-review tests | PASS, 78 / 10 tests respectively |
| Promptfoo through the real `/api/chat` | PASS, 42/42 independent reference cases |
| Standalone and separate-origin visitor journeys | PASS, 80/80; no skips or retries; Chromium, Firefox, WebKit and phone-sized WebKit |
| Firefox project form and keyboard close/resume stability | PASS, 3 repetitions each, 6/6 |
| Project prefill, correction, resume and independent sessions | PASS locally |
| Feedback failure/retry, payload choice and single receipt | PASS with local simulated receiver; real inbox UNTESTED |
| Keyboard/focus, automated axe checks, unsafe rendering and embed restrictions | PASS locally |
| k6 normal traffic, burst and real quota reset | PASS; normal p95 80.2 ms, burst p95 132.3 ms including rejections; 13 accepted, 14 expected 429 responses, 0 unexpected errors |
| Passive ZAP and outbound-request gate | PASS with the reviewed warnings below; no unintended app-server egress observed |
| Actual ForJu installation, physical phone keyboard and live AI mode | UNTESTED in this pass |

ZAP still reports the two previously reviewed medium warnings: inline styles
needed by the responsive interface and no HTML anti-CSRF token on a JSON-only
form. Forged-origin and cross-site-form rejection are checked separately; the
gate rejects new unreviewed medium/high findings. There are also informational
alerts. This is a passive baseline, not a penetration test or a claim of zero
security findings. [Recorded findings](evidence/knowledge-2026-11-07/zap-findings.json).

The rebuilt local preview was also exercised in installed Chrome: a German
equipment enquiry followed by its weekly cost, and an English school-stress
workshop followed by booking for a class. Both used actual server answers inside
the widget, with external browser requests blocked. Inspected screenshots:
[desktop German](evidence/knowledge-2026-11-07/widget-de-widget.png),
[phone-sized English](evidence/knowledge-2026-11-07/widget-en-widget.png),
[answers and network observations](evidence/knowledge-2026-11-07/widget-results.json).
These are local preview/viewport checks, not an installed production widget or
a physical phone test.

| Local production benchmark | Before | Final |
|---|---:|---:|
| Startup to first successful `/embed` | 547 ms | 542 ms |
| Peak sampled server RSS | 145.8 MiB | 145.5 MiB |
| HTTP p95 | 59.9 ms, 16 requests | 84.6 ms, 17 requests |

These are short runs on this Mac, with other checks running, not Render SLAs or
evidence of a speed improvement. The extra request is the screenshot regression.
The production dependency set is unchanged. The catalog is about 76 KiB; reviewed
source snapshots add about 44 KiB to the repository and are not imported by chat.
The source tooling occupies 22 MiB locally and peaked at about 362 MiB during
refresh. It is not installed or run by the production build.

The repository selects Render’s free plan: the published capacity is 0.1 CPU and
512 MB RAM. Local app RSS fits within that memory allowance, but this is not a
live capacity test. Free services can sleep and cold-start; existing account
quotas still apply. [Render plans](https://render.com/docs/compute-plans),
[free-service limits](https://render.com/docs/free).

## Three actual responses

These came from the local production endpoint, not a mock model.

**Visitor:** Wir brauchen Messgeräte für unser Schulprojekt.

> Schulen und Forschungsteams können über ForJu bei Partnern Räume und Messgeräte anfragen. ForJu hilft bei der Organisation und klärt Fragen zu Aufsicht und Haftung. Ob ein bestimmtes Gerät zu eurem Termin verfügbar ist und was die Nutzung kostet, müsst ihr anfragen. Beschreibt im Ressourcenformular, welchen Raum oder welches Gerät ihr braucht und wofür.

[Ressourcen](https://forju.at/de/services/ressourcen) · [Bei ForJu anfragen](https://forju.at/de/kontakt?intent=service&thema=ressourcen)

**Visitor:** My pupils feel overwhelmed before exams. Is there a workshop that could help? → How can I arrange it for my class?

> To arrange a school workshop, email Anja Hofer at anja.hofer@forju.at and ask about a date for your class.

[Vienna school workshops](https://forju.at/en/projects/schulworkshops)

**Visitor:** Welche Angaben braucht ihr im offiziellen Projektformular?

> Über das offizielle Projektformular kannst du deine Diplom-, Bachelor- oder Masterarbeit bzw. dein Forschungsprojekt vorstellen. Es fragt nach Name, E-Mail und Nachricht; der Betreff ist optional. Beschreibe dein Vorhaben kurz, damit sich das ForJu-Team bei dir melden kann. Das Formular bestätigt keine Förderung oder Annahme des Projekts.

[Forschungsprojekt einreichen](https://forju.at/de/kontakt?intent=projekt)

## Components actually used

| Component | License and compatibility | Decision, network and resources |
|---|---|---|
| [Mozilla Readability 0.6.0](https://github.com/mozilla/readability) | Apache-2.0; Node >=14; latest npm release checked, repository not archived and updated August 2026. [Notice and license](licenses/mozilla-readability.txt). | Adopted for public article extraction. Readability has no fetch step. Our wrapper fetches exact allowlisted ForJu URLs; it falls back to structured main content when article extraction loses substantial text. |
| [jsdom 31.0.0](https://github.com/jsdom/jsdom) | MIT plus bundled W3C Software and Document License 2023 and Unicode V3 notices, all [preserved](licenses/jsdom.txt). Requires Node 24.15+ on the Node 24 line; tested with 24.21.0. Published November 5; repository active. | Maintainer-only DOM parser. Default script execution and subresource loading remain disabled; a local trap-server test verifies no script/image/frame/style requests. No extracted HTML is rendered into chat. |
| [MiniSearch 7.2.0](https://github.com/lucaong/minisearch) | MIT; already installed; current npm release and non-archived repository checked. [License](licenses/minisearch.txt). | Reused and extended, not installed again. In-memory fuzzy keyword search; no telemetry, downloads or external question transfer. Keeps existing uncertainty/clarification paths. |
| [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), existing [pinned ONNX conversion](https://huggingface.co/Xenova/multilingual-e5-small) | Original weights MIT. Conversion links to the original model but its card did not independently declare a license; no conversion weights redistributed. Existing ONNX Runtime 1.31.1 (MIT), tokenizers 0.23.3 (Apache-2.0), NumPy 2.5.4 (BSD-3-Clause) reused locally. | Benchmarked, deferred. Correct `query:`/`passage:` prefixes, both languages, 512-token truncation, masked mean pooling, normalization, CPU threads=2, pinned hashes, telemetry disabled and Python network blocked. 9/12 single-turn topics, same as baseline local search; no calibrated abstention. Peak 563.5 MiB **before Next.js**, 129.1 MiB files, 577 ms load + 1.785 s indexing, 9.7 ms p95 query. It does not fit the current memory budget with the app. |

[Package/maintenance evidence](evidence/knowledge-2026-11-07/components.json) and
[model experiment](evidence/knowledge-2026-11-07/e5-experiment.json) preserve the
observations. The model experiment is a retrieval benchmark, not a generative
chatbot or a live-host benchmark. No embedding model was changed, so no model
migration was performed. Updated catalog versions would need re-import only if
the separately configured external AI mode were deliberately enabled.

Existing Zod and chrono-node remain the validation/date tools; their established
German/English tests still run. Existing Promptfoo (MIT), Playwright (Apache-2.0),
axe-core (MPL-2.0), fast-check (MIT), k6 (AGPL-3.0) and ZAP (Apache-2.0) remain
maintainer tools. No paid model judge was used. No `ollama`/`llama` CLI or running default Ollama endpoint was found, so DeepEval/Ragas model-based grading was not run.

The expanded suite exposed a test-tool regression: Playwright 1.65.0's Firefox
crashed intermittently during the German project form's axe scan. An independent
minimal HTML reproduction, without Compass loaded, also crashed Firefox;
Chromium and WebKit passed. This matches
[Playwright #43967](https://github.com/microsoft/playwright/issues/43967).
The test runner and matching browser image are pinned to 1.64.1, where that
minimal reproduction passes in all three engines. No axe rules, functional
assertions or browser projects were removed. The affected journey has an
explicit three-run stability gate with retries disabled. The separate-origin
keyboard close/resume journey is also repeated three times after repairing its
focus-return timing. This is a maintainer
tool change, not a production browser workaround; revisit the pin once an
upstream fixed version is available.

No duplicate crawler, fuzzy-search engine, CMS or workflow framework was added.
The measured failures did not justify Crawlee/Trafilatura in addition to this
bounded extractor, Fuse.js in addition to MiniSearch, or an XState/React Hook Form
rewrite of the working six-step flow. No approved scanned-document need was
found for Docling/Tesseract. Larger embedding/reranking systems, speech tools,
new monitoring servers and model-backed graders were deferred; they were not
silently installed or claimed as tested. Plain React text rendering and existing
privacy controls made another HTML sanitizer/redaction service unnecessary for
this change. The source-review CLI follows the existing Git editing process;
Decap CMS would introduce authentication and administration without solving a
failure demonstrated in this pass.

## Knowledge coverage and maintenance limits

60 exact German/English URLs were checked. 58 yielded useful structured text;
the two jobs pages need rendered-page review because their server HTML contains
little useful body text. This does **not** mean the jobs are gone. Seven catalog
records were revised/reviewed against 14 source pages. The refresh also flags
older, historical LinkedIn records for review; it does not claim to have freshly
scraped Facebook or authenticated social feeds. The internal uploaded document
remains excluded.

Readability is not trusted to activate content: changed, removed, redirected or
failed sources need a review. Reviewing one topic cannot hide a pending change
for another topic sharing its page. Source snapshots and previous catalog
versions are recoverable through Git and local review backups. Hash guards cover
records migrated through the new review command; untouched legacy entries retain
their earlier metadata until reviewed.

## Cost, privacy and release boundaries

- No added production dependencies, model hosting, subscription, paid API calls
  or new external service. Maintainer package/image downloads contact their public
  registries before synthetic tests begin. Public refresh GETs contact ForJu only.
- The full release suite uses a network-isolated container and an isolated quota
  database. Synthetic conversations, forms and reports stay there. The app’s
  server-egress observer must remain empty. Test delivery is local simulation,
  **not** verified delivery to a real ForJu/Adam inbox.
- In intended local-only operation, questions remain in the Compass browser/server
  exchange; the server reads bundled public knowledge. Session drafts and chat
  history are not a new stored dataset. A clicked source takes the visitor to
  ForJu. Existing explicitly confirmed report/project delivery uses Resend when
  configured; that existing boundary has not been expanded.
- Real project delivery still needs an approved, verified sender and destination.
  The local preview deliberately has no mail credentials and must never claim
  successful submission. The actual ForJu embed, real inbox delivery, physical
  mobile keyboard behavior and any future AI-backed launch remain live checks.
- This change has not been deployed to Render. There is no newly invented public
  URL. The tested local preview is `http://127.0.0.1:4262/preview?lang=de`.

Five specific questions for ForJu, ranked by impact on these **tested** tasks,
not measured visitor traffic. None was filled in by guessing:

| Priority / question | Already public | Still needs confirmation |
|---|---|---|
| 1. Which school-workshop dates and funding rules apply now, including outside Vienna? | [School workshops](https://forju.at/de/projects/schulworkshops) lists topics, Anja Hofer's booking contact and funding for Vienna school years 1–9. | Current slots, whether the published funding remains available, and eligibility/costs outside that scope. |
| 2. Which devices or rooms can classes actually request, with what loan conditions? | [Resources](https://forju.at/de/services/ressourcen) confirms requests through partners and help with organisation, supervision and liability. | Inventory, availability for a date, prices/deposits, loan duration and conditions. A general equipment offer does not confirm a particular sensor. |
| 3. Who should receive Compass project enquiries, and what response can visitors expect? | [Official project form](https://forju.at/de/kontakt?intent=projekt) requires name, email and message; subject is optional. | Responsible inbox/owner, response expectations and an approved verified mail sender for Compass. The app cannot promise receipt before a real delivery succeeds. |
| 4. Which seminars can people book now, and how? | [Seminars](https://forju.at/de/projects/seminare), published April 2024, describes research funding, pitching, public speaking, project management and leadership topics. | Current dates, booking route, capacity, eligibility and fees. |
| 5. Has the planned podcast launched, and where can people listen? | [Podcast](https://forju.at/de/projects/podcast) describes the planned activity. | Published episode/feed links and current status. A plan is not an available episode. |

## Run, update and roll back

```sh
npm run test:release
```

This is the complete repeatable local release gate, using the normal `/api/chat`
entry point. For source updates, run `npm --prefix tools/knowledge-checks ci
--ignore-scripts`, then `npm run knowledge:refresh`, review the printed snapshot,
edit the catalog, and run `npm run knowledge:review -- --ids id1,id2` followed by
`npm run knowledge:check` and the release gate. See the exact
[maintenance and rollback instructions](knowledge-maintenance.md).

The clean release branch is `release/knowledge-improvements-20261107`. Keep its
release commit when deploying. Revert that commit and redeploy to roll back;
restore both catalog and source-review JSON from the same local backup for an
uncommitted review. Existing unrelated working-tree changes are preserved.
