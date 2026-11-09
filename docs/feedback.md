# ForJu Compass feedback

## Visitor reports

The homepage and embedded panel use the same POST /api/feedback endpoint and
server-configured recipient. Visitors can open a general report or report an
individual answer. The optional checkbox starts unchecked. Selecting it sends
only that question and answer, which the visitor can preview before sending.
The reply email is optional. Error responses preserve the report and its retry
key. Confirmation requires a successful response after the provider accepts
the message. Closing the form returns focus to its opener.

## Local use now

Run `npm run dev` and open http://localhost:3000. Select **Problem melden**, choose a category and enter 10–1000 characters. Optional reply email is validated. With no credentials, **Senden** shows the safe error and preserves the draft; the server explains which variables are missing. No report is stored for later delivery.

Run checks with `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Tests use a fake email transport and do not send messages. They cover input bounds, malformed requests, header injection, HTML escaping, origin checks, size limits, honeypot, rate limits, idempotency, missing configuration and provider failure. A test success is not evidence of real email delivery.

## Optional real email setup, only when requested

Sending from localhost does not require publishing Compass or changing the official website. It does require a permitted sender at the email provider. Do not change ForJu DNS without the domain administrator's authorization.

Preserve existing `.env.local` entries and add these server variables:

```dotenv
RESEND_API_KEY=your_actual_resend_key
FEEDBACK_TO_EMAIL=adam.maskini@icloud.com
FEEDBACK_FROM_EMAIL=onboarding@resend.dev
FEEDBACK_IP_HEADER=
```

The receiver is configured only on the server and shared by both forms. Approved recipients are `adam.maskini@icloud.com` (currently selected) and `adam.maskini@forju.at`. The sandbox sender is permitted only for the existing account-owner iCloud inbox; ForJu delivery requires a verified domain sender. The optional form email is only Reply-To, never From or To. Do not prefix these variables with `NEXT_PUBLIC_`, put them in browser code, commit them, or share the key in chat.

The existing iCloud setup needs only the current Resend key and the settings above.
For a later switch to the ForJu inbox:

1. In Resend, add a domain or sending subdomain whose DNS you are authorized to manage. An independently owned domain can send to the ForJu receiver; the sender and receiver domains need not match.
2. The domain administrator copies the exact DNS names, types and values supplied by Resend. Typically these include DKIM TXT record(s), plus the SPF TXT and MX records for Resend's sending/Return-Path subdomain. Use the values shown for that domain and region; do not invent values, replace existing mail-delivery MX records, or create duplicate SPF records at one name. Review existing DMARC policy with the administrator.
3. Wait until Resend displays the sending domain as verified. `feedback@forju.at` is an example only and is not currently verified or configured here.
4. Create a dedicated API key named `ForJu Compass feedback`, with **Sending access**, restricted to the verified sending domain where supported. Store the one-time secret directly in `.env.local` and later in the host's secret settings.
5. Set From to an address on that verified domain and restart the local server.

References: [Resend domains](https://resend.com/docs/dashboard/domains/introduction), [API keys](https://resend.com/docs/dashboard/api-keys/introduction), [send email](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Real delivery verification

Once explicitly configured, submit a clearly labelled test using the actual drawer. Expect a success state and an accepted message in Resend. Check Resend's delivery status and the recipient's inbox/spam folder at the configured receiver; verify subject, body, metadata and Reply-To. Acceptance by Resend is not a guarantee of inbox arrival. The authorized development test to iCloud was confirmed Delivered in Resend; delivery to the production ForJu inbox has not been tested.

## Security and privacy

- Shared Zod schema, strict server field allowlist, trimmed/bounded values, valid timestamp, category and email.
- 64 KiB streamed request limit; five-second body-read timeout; same-origin checks when browser origin metadata is present; JSON only.
- Escaped HTML and plain-text email; fixed subject labels; CR/LF controls rejected in single-line fields.
- Honeypot silently ignored. Five valid attempts per client bucket per ten minutes.
- API errors never return stack traces, provider details or secrets. Logs contain generic event names and random request IDs, not report contents or email addresses.
- Only the requested page/browser/viewport/time/language metadata is collected. Only one explicitly selected exchange may accompany the report. The API rejects conversation arrays and extra fields. URL credentials/query/fragment are stripped.
- Client prevents rapid duplicate submissions and reuses the same payload/key on unchanged retries. Resend receives a stable idempotency key that includes a payload hash.

## Deployment and limitations

Use a Node-capable Next.js host, set the three email variables in server-side secret settings, restart/redeploy, and keep `.env*` ignored (`.env.example` is the intentional exception). Never publish `.env.local` or server source as public assets. The feedback API is not compatible with static-only export hosting.

The rate limiter is process-local: it resets on restart and is not shared across serverless instances. By default, unidentified clients share one bucket. Only set `FEEDBACK_IP_HEADER` if a trusted ingress proxy overwrites that header and clients cannot bypass it. For a public multi-instance deployment, replace the limiter dependency with a shared store or use an edge rate limit. Origin checks and honeypots alone do not prevent determined non-browser spam.

There is no database queue, delivery webhook, or automatic retry worker. Reports are not persisted locally. The provider wait is bounded to 15 seconds, but timing out does not cancel an already-running provider request; the client waits 22 seconds and unchanged retries reuse the idempotency key. Provider acceptance can be followed by a later bounce. Resend retains messages according to the account's policy; inbox access and retention must be managed by the recipient.

## Designated inbox

As requested on 9 November 2026, **both forms use adam.maskini@icloud.com**.
This is an explicit server configuration, not a failure fallback. The Resend
login stays unchanged. The previous demo/local-test flags are no longer needed.
No conversation is forwarded: a project sends only its form content, and a report
includes at most the question and answer that the visitor chooses to attach.

Provider acceptance and a message visible in the recipient mailbox are separate
checks. After a production build, run:

```sh
node tools/release/mail-delivery.mjs
node tools/release/mail-delivery.mjs --icloud
```

These checks exercise both real API handlers with synthetic messages and a local
receiver, including failure and idempotent retry, for both approved recipient
configurations. They do not send real mail. Real delivery requires a separately
authorized test through the configured app.
