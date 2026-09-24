# ForJu Compass feedback

## Overview

ForJu Compass includes a feedback and issue-reporting system that allows users to submit structured reports directly from the application interface.

The feedback flow supports German and English and is designed to preserve user input if submission fails.

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
```

Then open:

```text
http://localhost:3000
```

The feedback interface can be tested locally without exposing production credentials.

Automated checks:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Tests use a mock email transport and do not send real messages.

## Environment variables

Feedback delivery uses server-side environment variables:

```dotenv
RESEND_API_KEY=
FEEDBACK_TO_EMAIL=
FEEDBACK_FROM_EMAIL=
FEEDBACK_IP_HEADER=
```

These variables must not be prefixed with `NEXT_PUBLIC_` or exposed to client-side code.

Sensitive values should be configured only through local environment files or the deployment platform's secret settings.

## Email delivery

The application uses Resend for feedback delivery.

`FEEDBACK_FROM_EMAIL` must use a sender address permitted by the configured email provider.

`FEEDBACK_TO_EMAIL` defines the destination for feedback reports.

The optional email entered by a user is used only as a Reply-To address and is not used as the sender or destination.

For production use, sender-domain configuration and DNS verification should only be performed by an authorized administrator.

## Security and privacy

The feedback API includes:

- shared Zod validation
- strict server-side field allowlisting
- trimmed and bounded input values
- category and email validation
- streamed request-size limits
- request body timeouts
- same-origin checks when browser origin metadata is available
- JSON-only requests
- HTML escaping
- plain-text email generation
- CR/LF protection for single-line fields
- honeypot spam protection
- request rate limiting
- idempotency protection
- sanitized URLs
- generic public error responses

Application logs do not contain report contents, email addresses, credentials, or provider secrets.

The feedback system collects only metadata required for the submitted report, such as:

- current page
- browser information
- viewport information
- timestamp
- interface language

It does not intentionally collect:

- chat history
- cookies
- account credentials
- local storage contents
- unrelated application data

## Rate limiting

The current rate limiter is process-local.

This is sufficient for the current prototype, but a shared rate-limit store should be used if the application is later deployed across multiple instances.

`FEEDBACK_IP_HEADER` should only be configured when the hosting proxy reliably overwrites the selected header.

## Reliability limitations

The current prototype does not include:

- a persistent feedback queue
- delivery webhooks
- an automatic retry worker
- durable local report storage

Email-provider acceptance does not guarantee inbox delivery.

Retries use stable idempotency handling to reduce the risk of duplicate feedback emails.

## Deployment

The feedback service runs server-side and therefore requires a Node-capable Next.js deployment.

Required email settings should be configured through the hosting provider's environment configuration rather than committed to Git.

Environment files containing real credentials must remain excluded from version control.

## Prototype status

The feedback system is part of the current ForJu Compass prototype and may be extended as the project develops.
