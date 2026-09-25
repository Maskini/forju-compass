# ForJu Compass feedback

## Current status

Implemented locally. On 2026-09-21 the authorized iCloud test returned HTTP 200 with success=true from POST /api/feedback, and Resend showed Delivered to adam.maskini@icloud.com. The sending-only replacement key is saved in ignored .env.local (mode 0600). The official ForJu website and DNS were not changed. Production delivery to the ForJu recipient remains unconfigured; this is development-only testing.

## Implementation

New files: `app/components/feedback/FeedbackWidget.tsx`, `FeedbackForm.tsx`, `app/feedback.css`, `app/api/feedback/route.ts`, `lib/feedback-validation.ts`, `lib/server/feedback-handler.ts`, `feedback-email.ts`, `feedback-rate-limit.ts`, `lib/language.ts`, `tests/feedback.test.mjs`, `.env.example`, and this guide.

Modified: `app/layout.tsx` mounts the global drawer; `app/page.tsx` shares the existing language store; package manifests install `resend`, `zod`, `server-only`; `.gitignore` permits the empty `.env.example` while ignoring actual environment files. Existing chat and knowledge feedback remain separate.

The persistent DE/EN button opens a native modal drawer, with focus management, Escape/close support, keyboard containment, background scroll lock, validation, counters, disabled sending state, retained drafts on error and a success state. A new report can be started after success.

## Local use now

Run `npm run dev` and open http://localhost:3000. Select **Problem melden**, choose a category and enter 10–1000 characters. Optional reply email is validated. With no credentials, **Senden** shows the safe error and preserves the draft; the server explains which variables are missing. No report is stored for later delivery.

Run checks with `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Tests use a fake email transport and do not send messages. They cover input bounds, malformed requests, header injection, HTML escaping, origin checks, size limits, honeypot, rate limits, idempotency, missing configuration and provider failure. A test success is not evidence of real email delivery.

## Optional real email setup, only when requested

Sending from localhost does not require publishing Compass or changing the official website. It does require a permitted sender at the email provider. Do not change ForJu DNS without the domain administrator's authorization.

Preserve existing `.env.local` entries and add these server variables:

```dotenv
RESEND_API_KEY=your_actual_resend_key
FEEDBACK_TO_EMAIL=adam.maskini@forju.at
FEEDBACK_FROM_EMAIL=your_verified_sender_address
FEEDBACK_IP_HEADER=
```

The receiver is configured only on the server. The server also rejects any receiver value other than `adam.maskini@forju.at`. The optional form email is only Reply-To, never From or To. Do not prefix these variables with `NEXT_PUBLIC_`, put them in browser code, commit them, or share the key in chat.

1. In Resend, add a domain or sending subdomain whose DNS you are authorized to manage. An independently owned domain can send to the ForJu receiver; the sender and receiver domains need not match.
2. The domain administrator copies the exact DNS names, types and values supplied by Resend. Typically these include DKIM TXT record(s), plus the SPF TXT and MX records for Resend's sending/Return-Path subdomain. Use the values shown for that domain and region; do not invent values, replace existing mail-delivery MX records, or create duplicate SPF records at one name. Review existing DMARC policy with the administrator.
3. Wait until Resend displays the sending domain as verified. `feedback@forju.at` is an example only and is not currently verified or configured here.
4. Create a dedicated API key named `ForJu Compass feedback`, with **Sending access**, restricted to the verified sending domain where supported. Store the one-time secret directly in `.env.local` and later in the host's secret settings.
5. Set From to an address on that verified domain and restart the local server.

References: [Resend domains](https://resend.com/docs/dashboard/domains/introduction), [API keys](https://resend.com/docs/dashboard/api-keys/introduction), [send email](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

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
