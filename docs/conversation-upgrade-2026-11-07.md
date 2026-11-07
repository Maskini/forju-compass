# Conversation upgrade — 7 November 2026

This release improves the existing grounded response path. It does not enable a
paid provider, introduce a new visitor-data service, or claim general-purpose
chatbot accuracy. The independent local-model experiment was rejected for visitor
use after it invented facts.

## Shipped behavior

- Explicit requests to switch between German and English re-answer the relevant
  question in the requested language, preserving the offer, requested detail and
  pending advice choices. The preference survives the four-exchange history window.
- An explicitly supplied name is retained only in the current client session and
  can be corrected. The trash action and reload remove it. Separate sessions have
  separate state. This is a conversational preference, never authenticated identity.
- “Actually, we need advice, not equipment” now uses the corrected request. For
  ambiguous advice, Compass asks whether the visitor wants to develop an idea or
  needs specialist implementation help. Both German/English choices and ordinals work.
- Remote volunteering, hours and experience follow-ups use reviewed passages from
  the published Chief of Staff role. They do not generalize that role's conditions
  to every volunteer. The linked jobs page is the supporting evidence.
- The generic word “test” no longer pulls an unrelated driving-test question into
  a school-stress answer. Existing topic and typo tests remain in the suite.
- Visitor-facing help says project enquiry, not draft.

The new public record was checked in a real Chrome browser on both
[German](https://forju.at/de/jobs) and [English](https://forju.at/en/jobs) jobs pages.
The English page currently shows the role description in German; the English
catalog passage is a reviewed translation. The listing confirms remote work,
about 2–5 hours/week, and experience being helpful but not required for the named
role. Current availability and other roles' conditions must still be checked.
The usual bilingual snapshot review and content hashes were used. No Supabase
import is needed: `/api/chat` reads this catalog when `COMPASS_LOCAL_ONLY=true`.

## Measured results

All trials used synthetic questions; no test messages were sent to an actual inbox.

| Check | Result |
| --- | --- |
| New production HTTP conversations | **3/12 before → 12/12 after** |
| Four reserved scenarios, first post-fix run | **4/4** |
| Existing logistical follow-ups | **14/14**, plus **4/4** reserved |
| Existing knowledge questions | **15/15**, plus **8/8** reserved |
| Unit/request tests | **83 passed** |
| Chrome visitor journeys, including desktop and phone viewports | **28 passed** |
| Production build | **Passed** |

These are scenario pass rates, not a percentage of all possible visitor questions.
Checks require the expected facts, topic and exact supporting page and reject
specific fabrications. One clarification assertion was expanded to accept the
synonym “specialist”; the underlying requirement was unchanged. Newly found
failures were fixed, then the existing suites were rerun. Browser tests cover
standalone and separate-origin widget previews, language switching, corrections,
name retention, closing/reopening, accessibility, and existing project/report flows.
They do not prove a physical phone keyboard or the actual ForJu installation.

Raw before/after/reserved answers and the model experiment are under
`docs/evidence/conversation-upgrade-2026-11-07/`. Broader audit results are recorded below.

## Open-source reuse and model decision

The production implementation reuses **MiniSearch (MIT)** for reviewed phrase
matching and catalog retrieval. Source review reuses **Mozilla Readability
(Apache-2.0)** and **JSDOM (MIT)**. Existing Playwright/axe-core, Promptfoo, ZAP and
k6 checks are kept outside the production runtime. No production dependency was
added. License notices are in `docs/licenses/`.

A portable **Ollama 0.40.15 (MIT)** served **Qwen3:1.7b (Apache-2.0)** on loopback,
with cloud features disabled. The registry tag resolved to a Q4_K_M model reported
as 2.0B parameters, digest `8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7`.
Only synthetic questions and approved public text were supplied. There were eight
scenarios / twelve calls, with fixed context to isolate generation rather than
measure retrieval. Median observed request time was 1,956 ms; p95 was 7,450 ms.
The downloaded model was 1.36 GB; the runtime reported 1.94 GB allocated when loaded.

The model sometimes sounded natural but invented a membership age/fee policy,
asserted that equipment cannot be free, and denied an unconfirmed duration.
Most responses also omitted their supporting URL. Simple keyword assertions missed
some of these defects; every answer was read against the provided facts. The full
outputs include these manual findings. **It is not enabled for visitors.** The
benchmark remains available for comparing a future candidate under the same rules.

Official references: [Ollama local/privacy FAQ](https://docs.ollama.com/faq),
[Qwen model card and license](https://huggingface.co/Qwen/Qwen3-1.7B), and
[the tested registry tag](https://ollama.com/library/qwen3:1.7b).
The portable process was stopped after testing. Public model/source downloads
were external network traffic; model inference stayed on this laptop. Loopback
binding and observed connections were checked, not a full packet-capture audit.

## Privacy, cost and repeatability

The existing Compass host receives the question, last four exchanges, topic and
bounded session preferences. This change adds no conversation database, tracking,
cookie, browser storage or host-page disclosure. With local-only mode enabled,
visitor questions are not sent to OpenAI, Supabase or the local model. Existing
explicit feedback/submission flows and hosting logs remain separate boundaries.

No paid calls, subscriptions, changed hosting tier or new external service were
used. The model used the existing laptop's compute/disk. An API key or payment
account was not required. Server provider keys were blank for local trials, and
the release audit runs with Docker networking disabled. The app's runtime
package dependencies and Render configuration did not change.

Repeat the focused response pass after installing the repository's locked tools:

```sh
npm run check:responses
```

The complete existing security, browser, Promptfoo and load pass is
`npm run test:release`. The optional local model comparison is
`npm run benchmark:local`; setup and the loopback restriction are documented in
`tools/local-model-checks/README.md`.

## Remaining limits and rollback

This is a useful catalog-grounded assistant, not an unrestricted conversational
model. Unseen wording can still need clarification. Free Render cold starts,
actual website embed verification, the physical mobile keyboard and authorized
project-email delivery remain separate release checks. No ForJu website or DNS
setting was changed and no live email delivery is claimed.

Rollback is the preceding live commit **d86fb3b**, using Render Events followed by
`git revert` of this release on main. The public URL and installation snippet are
unchanged. Follow `docs/deployment.md` for updates and rollback.


## Final release audit

The final browser rerun passed **116/116** across Chromium, Firefox, WebKit and
mobile WebKit. The affected Firefox/WebKit trials also passed twice (**12/12**).
The first run had three failures: a five-second HTTP wait, an assertion before
streamed HTML arrived, and misdecoded launcher text in the separate-origin WebKit
preview. The harness now waits for HTTP and HTML readiness separately and
records timings. Fixture responses declare UTF-8. Because the script decoding
problem persisted in that WebKit preview, the launcher now uses ASCII Unicode
escapes for its German labels and symbols; rendered wording is unchanged.
No accessibility rule was disabled. The final browser run includes axe checks.

The isolated audit also passed **42/42 Promptfoo scenarios**, catalog validation,
source-tool tests, unit tests, build, origin/privacy checks, local inbox
idempotency, and the ZAP baseline gate. Lint has zero errors and ten pre-existing
warnings. ZAP still lists the previously reviewed anti-CSRF-token and inline-style
findings plus informational alerts; a passing baseline is not a penetration test.
No unintended server egress was recorded. Inbox results are simulated local
acceptance/deduplication, not delivery to a real ForJu inbox.

Final k6 results: normal-traffic p95 **176 ms**, burst p95 **343 ms**, **zero**
unexpected errors, **14 expected 429 responses**, and an accepted request after
the real quota window reset (**75 ms**). A Docker snapshot pause delayed one
recovery request in the initial run, so the load test was repeated without that
interference. Both the initial failures and final results are retained in the
release evidence instead of overwriting them with a single pass total.

Runtime code was unchanged between the HTTP/Promptfoo trials and the browser
rerun except for equivalent escaped launcher strings. The modified unit tests
were rerun (83 passing), and the canonical laptop project was rebuilt. The
existing localhost preview at port 4262 was restarted with local-only mode.
