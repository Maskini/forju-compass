# Bilingual retrieval improvement — 9–10 November 2026

## Decision

Keep the existing free, local-only answer path and improve its reviewed language
coverage. **Do not ship multilingual MiniLM in this Render service.** The measured
model-only Linux process exhausted a 512 MiB limit and was OOM-killed (exit 137).
This happened twice, including with the checked-in repeatable capacity probe.
No website process was included; a combined app test was therefore not attempted.
This simulates the published free plan's memory/CPU budget on local ARM64 Docker,
not Render hardware. [Render compute limits](https://render.com/docs/compute-plans).

The trial uses the open-source Transformers.js 3.8.1 library, quantized multilingual
MiniLM sentence encoder and ONNX Runtime 1.21.0. No generation model or remote
inference service was used. Model top-one retrieval selected the intended record
for 6/15 development offer questions; the old lexical component selected 3/15.
These are component figures, **not complete-chat scores**: existing dialogue and
workshop handlers already rescued other questions. Several semantic top matches
were wrong, including funding and researcher-introduction requests. Better vector
similarity alone would not justify replacing the complete route.

## What changed for visitors

- Existing MiniSearch-backed workshop recognition understands more ordinary
  descriptions of conflict, exam nerves, false online stories and global warming.
- Requests for money for project components resolve to funding assistance instead
  of an equipment loan. Introductions to biologists, chemists and physicists resolve
  to the public Connections service instead of generic contact/discussion records.
- A vague request for help asks a clarifying question. It does not assume funding.
- Deadline and price follow-ups retain the offer and state what is not confirmed.
- Requests for medication cannot become school-workshop advice through keyword
  overlap. Compass declines without a misleading citation.
- A project question asking for guaranteed acceptance gets a clear refusal to
  promise that outcome, with the verified project enquiry route.
- Source review also corrected workshop duration: the public German/English page
  metadata says **one-day workshops**. Compass gives that description and asks the
  visitor to confirm the chosen session's exact timing. Earlier tests incorrectly
  expected a blanket “no duration” answer; their source expectations were corrected.

Answers still come from approved bilingual records, not model-generated facts.
The path is `/api/chat` → conversation/facet/workshop handlers → `localKnowledge`
and `selectCatalogKnowledge` → the reviewed catalog response. All changes reach
`COMPASS_LOCAL_ONLY=true`; updating Supabase is not required for that mode.

## Evidence and repeatability

[Recorded answers and resource measurements](release-evidence/2026-11-09-semantic-benchmark/)
include original failures, not only passing results.

| Check | Before | After |
| --- | --- | --- |
| 24 fresh German/English development scenarios, production HTTP | 12/24 | 24/24 |
| First 12 held-out scenarios, after initial fixes | 7/12 | 12/12 after further fixes |
| Eight additional reserved scenarios | Not used for tuning | 8/8 first run |

These are a small synthetic set, not an estimated success rate for all visitors.
Each fixture records required facts, supporting URL and unknown details. Checks
cover intent, exact source, factual phrases and prohibited assurances. Two fixture
corrections are documented: allow the verified project enquiry next-step link,
and allow the official jobs page supporting a volunteer application. Neither
changes the required fact or permits arbitrary citations. Human reading was used
to resolve those oracle mistakes and review the public source text.

The full release suite includes all 44 new scenarios in Promptfoo's normal HTTP
provider, plus the existing scenarios. New Playwright journeys check ordinary
workshop questions and follow-ups in both languages, standalone and a widget on a
separate local origin, across desktop engines and a mobile viewport.

Independent Promptfoo scenarios reset only the disposable test quota database
through a loopback-only **fixture** endpoint. This avoids waiting through rate
windows between unrelated trials. Production quota code/settings are unchanged;
security and k6 still test real quota enforcement and recovery separately.
The fixture endpoint is not an application route and is not deployed.

Repeat the complete suite from the repository root:

```sh
npm run test:release
```

The optional model experiment has its own [setup and pinned downloads](../tools/semantic-checks/README.md).
No model package is added to the root production dependencies. The full run's
final counts and status are stored in `summary.json` beside the answer evidence.

Final results: **108 unit tests, 116/116 Promptfoo cases and 208/208 browser
journeys passed**, with zero browser skips or retries. Production build, source
validation, lint, targeted security checks and the local load check passed.
The first full run exited non-zero because one test incorrectly disallowed a
legitimate official jobs citation. After correcting only that expected-source
list, the complete Promptfoo set, unit tests, catalog check and production build
passed again in a fresh isolated container. Browser, security and load checks
already passed on the same application code; they were not repeated for that
fixture-only correction. The original failed run remains in the evidence.

The small local k6 check recorded 13 accepted requests, 14 expected HTTP 429
responses, zero unexpected server errors and successful recovery after quota
reset. Normal-traffic p95 was 14.1 ms; accepted burst p95 was 19.0 ms. These local
measurements do not predict Render latency or production capacity.

## Three actual improved answers

**“In unserer Klasse gibt es dauernd Streit. Könnte jemand mit uns üben, besser
miteinander auszukommen?”** now selects *Gemeinsam stark – Konflikte im Team
bewältigen*: pupils practise recognising conflict, developing solutions and
working together using role play/group exercises. Its source is the
[German school-workshop page](https://forju.at/de/projects/schulworkshops).
The exact returned text is in `http-after-final.json`, case `de-conflict`.

**“Is there a session for pupils on spotting made-up stories online and protecting
their personal information?”** now selects media literacy, explaining privacy,
cyberbullying and misinformation with the
[English school-workshop page](https://forju.at/en/projects/schulworkshops).
Exact response: `http-after-final.json`, `en-media`.

**“The parts for our experiment cost more than we can raise. Can you help us find
someone to cover the expense?”** now explains cost assessment and finding funding
partners, including that ForJu does not directly sponsor projects. It links to
[Financial support](https://forju.at/en/services/finanziell) and its enquiry form.
Exact response: `http-after-final.json`, `en-funding`.

## Licenses, data and cost

Production reuses **MiniSearch 7.2.0 (MIT)**; no new production dependency, paid API,
subscription, infrastructure plan or question recipient was introduced. Original
routing changes are project code. Benchmark-only **Transformers.js / multilingual
MiniLM use Apache-2.0**; **ONNX Runtime uses MIT**. License notices are retained in
`docs/licenses/`. The pipeline follows the official Transformers.js Node guide;
the fixture, gating and benchmarking code is project code.

The opt-in setup downloads about 135 MB of public pinned model/tokenizer files
from Hugging Face; every file is SHA-256 checked. Runtime model loading is local.
The capacity probe and full release suite run with Docker networking disabled;
tests use synthetic questions, public sources and a local mail receiver. No real
feedback/project emails were sent. The existing browser→Compass hosting request
and configured mail path are unchanged. No new visitor data destination exists.
There are no additional monetary charges for the changes; local CPU, disk and
public dependency downloads are required for the optional benchmark. This is not
a guarantee about unrelated existing hosting/mail account quotas.

## Release scope and limits

This is a tested local candidate, not a new public deployment. No ForJu site, DNS,
account or live hosting setting was changed. Live AI-backed mode, the actual ForJu
production embed, and real inbox delivery were not verified by this pass. Local
mail checks establish endpoint/idempotency behaviour against the fake receiver.

ZAP's baseline and the existing reviewed-alert gate passed, but the scan still
reports two medium categories: missing conventional anti-CSRF tokens and
`style-src unsafe-inline`. It also reports informational findings. Targeted
origin checks passed; passing the existing gate does not erase these warnings
or constitute an independent security audit. Exact findings are retained in
`zap-findings.log`.

The local-only engine remains bounded by reviewed wording and public knowledge.
The benchmark does not establish general conversational understanding, a clinical
safety classifier, or correctness on every paraphrase. Three historical LinkedIn
records are flagged as due for review by the catalog checker; their old content is
not a promise of a current offer.
