# ForJu Compass final-fixes pass · 9 November 2026

**Decision: ready for private testing of the catalog-only preview.** It does not install anything on the official ForJu website. No real emails were sent during this pass.

The tested base was `e9c805479267e97a9ec3e051cf63824df8d0fa1b`. [Candidate file hashes](release-evidence/2026-11-09/candidate-files.json) identify the changed application and test files. The release uses the existing Render service and URL, with `COMPASS_LOCAL_ONLY=true` and the existing iCloud recipient. No package, paid API, model or external service was added.

## Fixes made

- Offer-specific follow-ups now retain context for contact, registration, preparation, loan duration, deadlines and availability. An explicit new offer still wins over an earlier topic.
- “Wen schreibe ich dafür an?” after a media-workshop question returns Anja Hofer's published workshop contact. The widget's school-workshop action now opens that email address instead of a generic service form.
- A class needing money for prototype materials reaches financial support. A request for a submission deadline no longer drifts to donation-receipt information. Compass does not invent a deadline, fee, funding guarantee or device availability.
- The public catalog now includes a reviewed volunteering application route, project inquiry fields, and everyday time-management phrasing. Reviewed pages include the German and English workshop, resources, jobs and contact pages. Record hashes and excerpts remain in `knowledge/source-review.json`.
- Fixed a delayed project-close event stealing focus from the composer. In the first complete candidate run, immediately returning from the form and typing reopened it instead of sending. Focus restoration now leaves a visitor’s newly focused input alone; a deterministic delayed-close regression covers the race. Nine focused checks passed across Chromium, Firefox and WebKit. [Focus evidence](release-evidence/2026-11-09/focus-recheck.json).
- The video page no longer says project email is disabled. It accurately explains that the recording shows completion/review without sending.
- The repeatable browser suite now exercises actual project submission, lost acknowledgement and retry, in addition to reporting. A dedicated local-provider check uses the currently configured iCloud recipient and sandbox sender in both languages.

## Answer evidence

Nine fresh scenarios initially passed **2/9**. After fixes the same visitor needs passed, together with an additional materials-budget scenario (**10/10**). Two expected topic IDs were refined from the general workshop to the matching specialist workshop; the baseline cases also had substantive answer/contact failures. Three questions reserved until after those fixes initially passed **1/3**; procrastination and thesis-preparation follow-ups exposed two further gaps. Those are fixed and the rerun passed **3/3**. They are now regression cases, not blind holdouts. These numbers do not estimate accuracy on arbitrary questions.

[Before answers](release-evidence/2026-11-09/answers-before.json) · [After answers](release-evidence/2026-11-09/answers-after.json) · [First held-out run](release-evidence/2026-11-09/answers-holdout.json) · [Held-out rerun](release-evidence/2026-11-09/answers-holdout-rerun.json).

The complete Promptfoo run calls the actual `/api/chat` with conversation history and returned topic. It checks expected facts, explicit unknowns and supporting URLs independently of the answer implementation. Human review is still needed for claims beyond those assertions. The workshop funding statement is dated November 2024; current prices, device inventory, deadlines and availability must not be inferred from it.

## Final automated results

The complete rerun uses the same production source identified by the candidate hashes. **87 unit tests, 10 source-tool tests, 55 Promptfoo scenarios (78 turns), and 136 browser checks passed.** The browser run had no failures, retries, skips or flaky results: 42 checks each in Chromium, Firefox and WebKit, plus 10 mobile-WebKit checks. Six repeated Firefox stability checks and nine focused close-event checks also passed.

| Critical behavior | Result and evidence |
|---|---|
| German workshop question → follow-up → published contact/source | PASS in standalone and separate-origin widget |
| English correction → appropriate equipment enquiry | PASS in standalone/widget coverage and manual phone-width use |
| Project prefill → edit → close → resume → review → send/retry | PASS; the local receiver got exactly one edited project per retry journey |
| Report one answer → choose inclusion → fail → retry → return | PASS; optional reply email, limited context and one local receipt verified |
| Keyboard/focus, clearing, scrolling, dragging and page-return reset | PASS, including the repaired close-event race |
| Embed permissions, inert markup, session isolation and observed egress | PASS in the isolated suite |
| Production build, catalog review and lint | PASS; lint retains 10 existing warnings, no errors |

[Browser outcomes and payload evidence](release-evidence/2026-11-09/browser-results.json) · [All final answers](release-evidence/2026-11-09/final-answers.jsonl) · [Configured iCloud-mode local delivery](release-evidence/2026-11-09/configured-mail.json).

Accessibility checks cover tested states and keyboard journeys; they are not a certification of every possible interaction.

The final command exited **0**, with every stage passing. [Full stage summary](release-evidence/2026-11-09/summary.md). k6 measured **32.0 ms normal p95** and **48.4 ms burst p95** (the latter includes fast quota responses): 13 accepted, 14 expected HTTP 429, no unexpected responses. Recovery after the real limit reset passed. These are small-sample warm local timings, not Render performance claims.

The ZAP passive scan found no high alerts or unreviewed medium alerts. Two existing medium warning categories remain explicitly reviewed: inline CSS styling and absence of an HTML CSRF token on the JSON-only feedback form. Targeted tests separately verify origin rejection and rejection of cross-site form encoding. [Scanner findings](release-evidence/2026-11-09/zap-findings.log). This is a baseline, not a penetration test. No unintended server egress was recorded; external networking was independently disabled by the container.

## Manual browser checks

On the local production build, a German teacher reached the published media-workshop contact over two turns. At 390 × 844, an English visitor corrected “support” to borrowing equipment and received the relevant enquiry route. A project description from chat was prefilled; the visitor changed two ponds to three, closed the form and reopened it with the correction and title intact. Focus returned to the resume action and the conversation remained in place.

The actual public ForJu workshop, resources, jobs and contact pages were inspected in a browser. The official contact form was not submitted. Automated source-link navigation uses a clearly labelled offline destination at the expected source URL, so that test alone is not evidence of live source contents.

## Privacy, cost and delivery boundaries

The local suite uses synthetic data, a disposable quota database, a fake mail key and a loopback receiver inside Docker with external networking disabled. Promptfoo, Playwright/axe, k6 and ZAP stay outside the application runtime. Real application routes and the Resend SDK run; inbox receipt is simulated. Server acceptance and a local provider receipt do not prove delivery to an actual inbox.

The existing live email configuration sends both forms to **adam.maskini@icloud.com**, as requested. No account email, DNS, sender, recipient or hosting plan was changed in this pass. Previous live server acceptance is not an independent confirmation that an email appeared in that inbox.

## Limits before an official-site rollout

1. The actual ForJu CMS installation and its headers/consent UI are not available for integration here. The separate-origin local host is verified instead.
2. A phone-sized browser was tested; a physical phone and its native keyboard are not verified.
3. Actual inbox receipt remains separate from local acceptance/retry evidence. Do not switch to the ForJu recipient without a sender authorized for that destination.
4. The free Render service warns that an idle instance may take 50 seconds or more to wake. Warm local measurements cannot establish cold-start availability.
5. This release is catalog-only. Remote AI mode and local generative models were not enabled or evaluated.

These are limits for a public organizational rollout, not a request to share the preview now.

## Repeat, update and rollback

Run `npm run test:release` from the repository root with local Docker running. The command builds and starts production, then prints the evidence directory and stage results. See [suite instructions](../tools/release/README.md).

For content updates, edit the existing reviewed catalog and use the documented review workflow, then run the catalog checks and release suite. Push the reviewed release to `main`; Render redeploys the same URL. Verify the new commit is Live and repeat a useful conversation. For this pass, the known previous deploy is `dep-dbp071etlv9c73dt85lg` (`e9c8054`). Roll back to that deployment in Render and revert the release commit on `main` to keep source and hosting aligned. See [deployment instructions](deployment.md).

[Historical 6 November audit](release-evidence/2026-11-06/release-decision.md).
