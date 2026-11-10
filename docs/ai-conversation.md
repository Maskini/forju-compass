# AI conversation architecture — 10 November 2026

Compass now has one assistant implementation for the website widget and standalone
chat. In AI mode the model handles the conversation **before** the catalog's fixed
handlers. Local mode and the existing forms remain available.

```mermaid
flowchart LR
  W[Widget or standalone] --> A[Validate request and rate limit]
  A --> B[Reserve bounded API allowance]
  B --> K[Reviewed public evidence and recent exchange]
  K --> O[One OpenAI Responses call]
  O --> V[Validate evidence and resolve approved links]
  V --> W
  A -->|Local mode| L[Existing catalog answers]
  B -->|Limit or outage| L
  O -->|Outage| L
  V -->|Invalid evidence| C[Honest recovery and verified contact]
  C --> W
```

## What this takes from AMS

The public [AMS Berufsinfomat description](https://www.ams.at/arbeitsuchende/aus-und-weiterbildung/berufsinformationen/berufsinformation/berufsinfomat)
documents ChatGPT-generated answers grounded in maintained organisational
knowledge, follow-up conversations, reset and feedback. Compass adopts that
general separation. This is not a copy of AMS's private implementation, nor a
claim of equal or better answer quality. AMS code was not reused.

## Responsibilities

- `app/api/chat/route.ts`: input validation, rate limiting, AI-first routing and
  existing deterministic fallback. An AI failure cannot be labelled AI success.
- `lib/server/assistant.ts`: server-only credentials, one Responses call, 18-second
  timeout, no retries, cooldown on 401/403/429, budget reservation and safe logs.
- `lib/assistant.ts`: the prompt, public evidence projection, output schema and
  validation. The current 46 reviewed records fit a bounded context. This avoids
  a brittle keyword gate deciding whether natural language can reach the model.
  If the request exceeds 80,000 UTF-8 bytes, it falls back rather than silently
  truncating evidence. Growing beyond this should trigger evaluated retrieval,
  not an automatic context/budget increase.
- The current question, up to four recent exchanges and a visitor-supplied name
  are supplied. History is context, not factual evidence. The model can clarify,
  rephrase, acknowledge corrections and help word an inquiry.
- Every fact paragraph must identify a reviewed record and a numbered supporting
  passage supplied by the server. URLs are resolved by the server, never copied from model text. The model does not need to reproduce a source quote;
  paraphrased evidence in an earlier trial caused needless rejection, so the
  final schema selects server-owned passage indices instead.
  Helpful request links are paired with the offer page. Offers with email-only
  contact resolve to their verified page instead of an invented form URL.
- Passage-reference validation does **not** prove semantic entailment. Human review and
  live adversarial cases remain necessary: an unrelated real passage could still
  accompany a wrong claim. No guardrail is advertised as a hallucination guarantee.
- The model has no browsing, mail, booking, write or submission tools. Project and
  feedback delivery remain in their existing confirmed form endpoints. The chat
  cannot produce a valid receipt. Typical fabricated transaction confirmations
  are rejected, but that pattern check is not a universal semantic guarantee.
- `/api/search` uses MiniSearch locally in both modes. Switching on chat AI no
  longer opens an unbudgeted embeddings call. Supabase is not needed for this chat
  path; import/maintenance tooling and existing public-retrieval tests remain.

## Configuration and rollout

Server-only values (never place a key in the embed snippet):

```dotenv
COMPASS_LOCAL_ONLY=false
OPENAI_API_KEY=<private active project key>
OPENAI_CHAT_MODEL=gpt-5.6-luna
COMPASS_AI_DAILY_BUDGET_USD=0.25
COMPASS_QUOTA_DB=/path/to/private/persistent/quota.sqlite
```

`render.yaml` intentionally remains local-only until the hosting environment is
reviewed and a live release is selected. A valid laptop key is not proof that
Render has the same key. The local API trial does not deploy anything.

The existing model is retained. Standard prices checked against
[OpenAI's model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
on 10 November 2026 are $0.20/M input and $1.20/M output tokens. The ledger reserves
a conservative estimate before each call: input UTF-8 byte count plus overhead,
at the maximum cache-write rate, and the full 1,800 output-token ceiling. A
completed standard-tier response reconciles this hold against provider-reported
usage (including cache reads and writes). The persisted reservation can settle
only once, even across a restart or midnight. Unknown cache-write TTL is charged
at the higher rate. Missing/invalid usage, timeouts and crashes keep the full
hold; an unexpected overrun is charged in full and stops subsequent calls. Old
unsettled allowances are not retroactively refunded.

Cached input is $0.02/M; cache writes are 1.25x/2.5x input for 30-minute/12-hour
storage, as documented in [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).
This is application accounting, not a verified invoice. Recheck prices before
changing the model; an unpriced override fails closed. A zero budget disables
calls. Existing HTTP rate limits also apply.

This is a single-host application allowance, **not** an account-wide billing cap.
It survives a process restart only when the database survives. Render free
storage is ephemeral and redeploys can reset it. Separate replicas do not share a
counter. Do not call it a durable monetary guarantee on the current free host.
Use appropriate provider project controls before a public AI rollout; this pass
does not change account billing settings or buy a persistent disk.

Rollback: set `COMPASS_LOCAL_ONLY=true` and restart the service. The same widget,
URL and forms work with local answers. Reverting this release is not necessary
just to turn off inference. Keep the security dependency upgrades when reverting
behaviour changes; the preceding lockfile has known advisories. The existing
Render rollback procedure is documented in `deployment.md`.

## Privacy

AI mode sends the question, supplied recent context/name and public ForJu records
to OpenAI only. `store:false` disables stored Response objects; it does not mean
zero provider retention. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
The source catalog contains approved public summaries, not the internal uploaded
document. No conversation database or new provider was introduced. Existing
per-tab recovery remains, and the expandable visitor notice now describes AI
processing. Project/report data still goes through the existing Resend adapter
only after the visitor sends the form. The release-fix pass sent two authorised,
labelled synthetic tests; provider acceptance and inbox verification are recorded
separately in `release-fixes-2026-11-10.md`. The host's privacy information must
cover this processing before public use.

## Repeatable checks

Local checks (no model calls):

```sh
npm test
npm run test:release
```

The visitor tests use isolated storage, blocked outbound traffic and local mail
fixtures; they must remain `COMPASS_LOCAL_ONLY=true`. Public tool downloads and
the dependency metadata audit happen before those isolated tests. This suite
cannot establish live AI answer quality.

For a live synthetic trial, build first and start a **separate loopback** server
with the configuration above, an isolated quota database and `RESEND_API_KEY=`:

```sh
npm run build
COMPASS_LOCAL_ONLY=false COMPASS_QUOTA_DB=/tmp/compass-ai-trial.sqlite RESEND_API_KEY= node --env-file=.env.local node_modules/next/dist/bin/next start -H 127.0.0.1 -p 4197
```

In another terminal, run the bounded German/English scenarios (at most eight calls):

```sh
node tools/assistant-checks/live.mjs --live
node tools/assistant-checks/browser.mjs --live
node tools/assistant-checks/live.mjs --live --holdout
```

The holdout check adds four fresh turns. The browser check makes four additional synthetic calls, opens the source pages,
then closes/reopens the widget at desktop and phone viewport sizes. It uses a
clearly labelled, browser-only preview on separate origins; it does not install
anything on forju.at. It requires the existing visitor-check dependencies and
Chrome. Physical phone keyboard behaviour is a separate check.

Live results go to ignored `work/assistant-checks/`. The runner fails if any reply
is a local fallback rather than an actual OpenAI response. It records expected
facts/links but explicitly asks for human review of claim support and usefulness.
The optional `capture.cjs` records synthetic model output/usage only for diagnosis;
never load it on a public service or when a real visitor is testing.

`X-Compass-Answer-Mode` distinguishes `openai`, `local` and `fallback` on chat
responses. `X-Compass-Fallback` provides a bounded reason code without revealing
prompts, credentials or raw provider errors. These are maintainer diagnostics,
not technical labels in the conversation. When AI is unavailable, both chat
surfaces instead show a short visitor-facing notice explaining that the answer
is general information and offering the team for individual help.

No new dependencies were added. Reused OpenAI JS SDK: Apache-2.0; MiniSearch: MIT;
Zod: MIT; existing Playwright and axe tooling remain development-only.


## Availability checks

`/api/health` makes no provider calls and returns no credentials or conversation
content. `alive` means the app can serve requests, **not** that OpenAI or an inbox
is verified. `assistant.state` distinguishes local mode, missing settings,
budget exhaustion, provider problems and recent success. `providerVerified`
requires a successful AI answer within 15 minutes; a cold process starts
unverified. `projectDelivery: configured-not-verified` never means delivered.
Only an unusable quota store produces HTTP 503. An exhausted daily allowance
remains HTTP 200 so a host health check cannot restart the app to reset a limit.
Render's health path is `/api/health` in the blueprint; an existing manually
configured service may need that setting changed in its dashboard.

```sh
COMPASS_CHECK_URL=https://forju-compass.onrender.com node tools/assistant-checks/readiness.mjs
# After one authorised synthetic AI conversation:
COMPASS_CHECK_URL=https://forju-compass.onrender.com node tools/assistant-checks/readiness.mjs --require-ai --require-mail
```

A nonzero exit requires investigation. The strict command intentionally fails
before AI has actually answered. Logs contain only outcome and duration, never
questions, names or raw provider errors. This is a manual preflight, not a
scheduled monitoring service.

The revised local fallback compares a visitor's weekly/monthly volunteering
availability against the published role, without inventing smaller openings.
Targeted answer guards reject universal free/eligibility promises, currency
amounts absent from cited passages, and common fabricated delivery claims.
These checks do not provide general semantic verification or cover every
possible phrasing. Continue inspecting real answers and approved source updates.
