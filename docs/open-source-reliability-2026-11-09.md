# Applying open-source chatbot reliability guidance

This pass uses the existing Compass implementation. It adds a small conversation-routing fix and reproducible tests; it does not add a model, service, subscription, production dependency or data destination. The public deployment is unchanged by this local development pass.

## People and projects reviewed

- **Hamel Husain:** the public [evaluation guide](https://hamel.dev/blog/posts/evals-faq/) explains how to inspect actual failures, write checks for those failure modes and compare changes. This is educational guidance, not code copied into Compass. His paid courses or consulting are separate from the public guide.
- **Alan Nichol and the Rasa developers:** [their original paper](https://arxiv.org/abs/1712.05181), [conversation and fallback documentation](https://legacy-docs-oss.rasa.com/docs/rasa/fallback-handoff/) and [community forum](https://forum.rasa.com/) are useful references for dialogue handling. The Apache-2.0 [Rasa Open Source repository](https://github.com/RasaHQ/rasa) now explicitly says maintenance mode. Its newer commercial products must not be treated as the same free software. No Rasa migration was made.
- **The deepset/Haystack team:** [tutorials](https://haystack.deepset.ai/tutorials) cover retrieval, conversational history and evaluation; [community questions](https://github.com/deepset-ai/haystack/discussions) are public. The core [license](https://github.com/deepset-ai/haystack/blob/main/LICENSE) is Apache-2.0. Haystack was reviewed, not installed. This failure was dialogue routing, not evidence that Compass needs a new Python retrieval stack.
- **Ian Webster and the Promptfoo maintainers:** the [open-source evaluator](https://www.promptfoo.dev/docs/intro/) already runs in Compass's isolated release tooling. This pass extends its existing dataset. Webster’s [original practical guide](https://www.ianww.com/blog/2023/05/21/prompt-engineering-framework) explains the test-and-compare workflow. [Telemetry and update checks](https://www.promptfoo.dev/docs/configuration/telemetry/) are disabled in the runner, and the test container has no external network.

Public guides and forums are available without buying consulting. They do not establish that someone will personally maintain Compass for free.

## Observed failure and change

A synthetic visitor says: “Unser Klassenprojekt untersucht das Wasser im Schulteich.” The previous route answered: “Dazu habe ich keine gesicherte Information. Welchen ForJu-Service oder welches Projekt meinst du?” English descriptions could drift to equipment or employment records instead.

The failure occurred at intent selection: a visitor's own description was treated as a catalog lookup. The new bounded recognizer in `lib/dialogue.ts` routes clear German/English project introductions to the existing project-help question and choices. Concrete questions, borrowing/funding/submission requests and unrelated software text retain the existing handlers. It claims no eligibility, price, device availability or successful submission. The next selection uses the existing MiniSearch-backed dialogue and approved public catalog.

The changed code is original. The existing MiniSearch dependency remains MIT licensed, with its notice already retained in `docs/licenses/minisearch.txt`. No external code was copied from the guides. The project form, delivery configuration, public facts, branding and privacy settings are unchanged.

## Repeat and interpret the checks

`npm test` includes 13 focused API-handler scenarios alongside the existing tests. The additional JSON fixtures also join the normal Promptfoo suite in `npm run test:release`; four reserved/fresh scenarios run only in its final phase. Expectations were written before the fix and include concrete request/topic-change controls. The project index control's expected URL was corrected to the approved catalog’s `/de/projects` link before recording the baseline.

The tests deliberately distinguish a clarifying question from a sourced factual answer. Passing these scenarios is not a general accuracy percentage. Longer project descriptions, mixed requests and unfamiliar expressions can still require additional work. A local language-model experiment already exists in `tools/local-model-checks/`; its November 7 report found invented facts despite fluent answers, so it is not enabled for visitors.

Local tests use only synthetic conversations, approved public content, an isolated quota database and a loopback feedback receiver. No live email is sent. No AI provider is called with `COMPASS_LOCAL_ONLY=true`; no test question leaves the isolated test network. This change adds no monetary cost. Model-backed answers and the actual ForJu-site installation are not newly validated by this pass.

## Verified results

- Focused API-handler regression set: **6/13 before → 13/13 after**. These numbers describe this deliberately targeted set, not general chatbot accuracy.
- First production Promptfoo run: **69/70**. The reserved history-project example failed because “how” inside a statement was treated like a question. The recognizer was corrected; the failure is retained in the evidence.
- Final production Promptfoo run: **72/72**, comprising the existing 55 scenarios plus 17 project-related scenarios, including two newly added questions. All use `/api/chat`; no paid model or remote judge is used.
- **107 unit tests passed**; production build passed; lint has zero errors and ten existing warnings.
- **22 browser journeys passed**, with no skips, retries or flaky results: Chromium, Firefox and WebKit on desktop, plus a mobile WebKit viewport. The journeys cover the standalone app and a separate-origin widget, project description → support choice → correct source link → prefilled form → return to chat, and the existing teacher and project-resume flows. A test initially omitted the standalone link’s visible arrow from its accessible name; correcting that selector resolved four test failures. The UI did not need to change.
- External networking was disabled and no server egress was recorded. Browser assertions also detected no unintended external requests. No real messages were sent.

[Compact evidence](release-evidence/2026-11-09-project-routing/summary.json), [actual project answers](release-evidence/2026-11-09-project-routing/project-answers.json), [reserved failure before correction](release-evidence/2026-11-09-project-routing/first-failure.json) and [candidate source hashes](release-evidence/2026-11-09-project-routing/candidate-sha256.json) are retained. Full local logs are in ignored `work/project-routing/`.

This is a focused reliability improvement, not a new complete release certification. k6, ZAP, live delivery, AI-backed answers and the actual ForJu-site installation were not rerun. The existing Render deployment remains unchanged.
