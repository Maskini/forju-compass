# ForJu Compass feedback

## Overview

ForJu Compass includes a feedback and issue-reporting system that allows users to submit structured reports from the application interface.

The feedback flow supports German and English and is designed to preserve user input when submission fails.

## Implementation

The feedback system includes:

- a global feedback drawer
- category selection
- message validation
- optional reply email
- client-side input limits and counters
- loading and success states
- retry-safe submissions
- server-side validation
- email delivery through Resend
- request rate limiting
- duplicate-submission protection

Relevant implementation files include:

- `app/components/feedback/FeedbackWidget.tsx`
- `app/components/feedback/FeedbackForm.tsx`
- `app/feedback.css`
- `app/api/feedback/route.ts`
- `lib/feedback-validation.ts`
- `lib/server/feedback-handler.ts`
- `lib/server/feedback-email.ts`
- `lib/server/feedback-rate-limit.ts`
- `tests/feedback.test.mjs`

## Local development

Run:

```bash
npm run dev
## Real delivery verification

Once explicitly configured, submit a clearly labelled test using the actual drawer. Expect a success state and an accepted message in Resend. Check Resend's delivery status and the recipient's inbox/spam folder at `adam.maskini@forju.at`; verify subject, body, metadata and Reply-To. Acceptance by Resend is not a guarantee of inbox arrival. The authorized development test to iCloud was confirmed Delivered in Resend; delivery to the production ForJu inbox has not been tested.

## Security and privacy

- Shared Zod schema, strict server field allowlist, trimmed/bounded values, valid timestamp, category and email.
- 16 KiB streamed request limit; five-second body-read timeout; same-origin checks when browser origin metadata is present; JSON only.
- Escaped HTML and plain-text email; fixed subject labels; CR/LF controls rejected in single-line fields.
- Honeypot silently ignored. Five valid attempts per client bucket per ten minutes.
- API errors never return stack traces, provider details or secrets. Logs contain generic event names and random request IDs, not report contents or email addresses.
- Only the requested page/browser/viewport/time/language metadata is collected. No chat messages, cookies, account details, storage contents or invented session/conversation IDs. URL credentials/query/fragment are stripped.
- Client prevents rapid duplicate submissions and reuses the same payload/key on unchanged retries. Resend receives a stable idempotency key that includes a payload hash.

## Deployment and limitations

No deployment was performed. If deploying later, use a Node-capable Next.js host, set the three email variables in server-side secret settings, restart/redeploy, and keep `.env*` ignored (`.env.example` is the intentional exception). Never publish `.env.local` or server source as public assets. The feedback API is not compatible with static-only export hosting.

The rate limiter is process-local: it resets on restart and is not shared across serverless instances. By default, unidentified clients share one bucket. Only set `FEEDBACK_IP_HEADER` if a trusted ingress proxy overwrites that header and clients cannot bypass it. For a public multi-instance deployment, replace the limiter dependency with a shared store or use an edge rate limit. Origin checks and honeypots alone do not prevent determined non-browser spam.

There is no database queue, delivery webhook, or automatic retry worker. Reports are not persisted locally. The provider wait is bounded to 15 seconds, but timing out does not cancel an already-running provider request; the client waits 22 seconds and unchanged retries reuse the idempotency key. Provider acceptance can be followed by a later bounce. Resend retains messages according to the account's policy; inbox access and retention must be managed by the recipient.

## Authorized local iCloud test (current)

Local development now sets `FEEDBACK_LOCAL_TEST=true`, `FEEDBACK_TO_EMAIL=adam.maskini@icloud.com`, and `FEEDBACK_FROM_EMAIL=onboarding@resend.dev`. This exception only works with `NODE_ENV=development`; production still requires the original ForJu recipient. Resend's test sender is restricted to the account owner's email address. The sending-only replacement API key is now configured locally. To revert, remove the local-test flag and restore the ForJu recipient and a verified sender. Never deploy these local-test settings.
