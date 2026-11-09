# Prototype deployment

## Release status

Use the existing https://forju-compass.onrender.com service. Render tracks
GitHub main. Follow [the installation guide](embed.md) for the website snippet.
Before publishing, record the current successful Render deploy and Git commit.

## Update and rollback

Review a content or code change, run the clean-checkout commands in README,
then merge it into main. Wait for Render to mark the new deploy Live. Check
that /compass-widget.js serves JavaScript and try a German or English follow-up.
For an immediate rollback select the last successful deploy in the existing
Render service’s Events view and roll back to it. Also revert the corresponding
release commit on main using git revert, then push, so the next deploy matches.
Rolling back the initial widget installation removes the launcher. Remove its
footer snippet if reverting permanently. The standalone site keeps its URL.

## Render configuration

`render.yaml` declares a free Node Web Service, repository root, `main` branch,
automatic deployment on commits, `npm ci --include=dev && npm run build`, and
`npm start -- --hostname 0.0.0.0`. Next respects Render's PORT variable.
Node is pinned to 24.21.0. Confirm the service tracks the intended release commit.

Free hosting may sleep when idle and uses ephemeral storage. Existing paid
external API usage is separate from the hosting plan. Do not promise that
OpenAI requests cost zero. Do not enable local-file feedback storage on Render
as though it were durable.

References: https://render.com/docs/deploy-nextjs-app and
https://render.com/docs/blueprint-spec

## Environment variables

No browser-exposed environment variables are required.

For the catalog-only release, set COMPASS_LOCAL_ONLY=true and configure
COMPASS_EMBED_ORIGINS before building, as described in [the embed guide](embed.md).
OpenAI and Supabase credentials are optional and used only by the separate AI mode.

Optional server-only configuration:
- OPENAI_CHAT_MODEL: override the existing model.
- RESEND_API_KEY, FEEDBACK_FROM_EMAIL, FEEDBACK_TO_EMAIL: feedback delivery.
- FEEDBACK_IP_HEADER: only a header the hosting proxy reliably overwrites.
- KNOWLEDGE_FEEDBACK_DIR: requires durable private storage; omit on free Render.

The Blueprint defaults to adam.maskini@forju.at with the old iCloud demo mode
disabled. Existing Render environment values must also be updated; a Git push
alone does not prove the dashboard settings changed. Do not change ForJu DNS.

For a private account-owner test without a verified domain, first change and
confirm the Resend account email to adam.maskini@forju.at. The user completes
that login change and both confirmation links. Then configure the existing service:

```dotenv
FEEDBACK_TO_EMAIL=adam.maskini@forju.at
FEEDBACK_FROM_EMAIL=onboarding@resend.dev
PROJECT_FROM_EMAIL=onboarding@resend.dev
FEEDBACK_DEMO_MODE=false
COMPASS_ACCOUNT_TEST_MODE=true
```

This explicit mode permits only that recipient and exact sandbox sender for both
forms. Resend still enforces its verified account-email restriction. A setting
alone is not verification: submit one labelled report and one labelled project
when authorized, check provider acceptance and delivery, then verify the intended
mailbox. Never send to iCloud as a fallback. Before public production rollout,
configure a verified domain sender and set COMPASS_ACCOUNT_TEST_MODE=false.

NODE_ENV=production and NODE_VERSION are set by the Blueprint. Secret values
must only be supplied through Render's private environment settings, never Git.

## Live checks

After deployment verify the script, response headers, allowed and denied
parent origins, and a complete conversation on a physical phone. Verify live
feedback delivery separately with an authorized recipient if enabling email.

### Project draft email
On Review, **Send / Senden** submits the edited draft and optional reply address to
the server. The server sets the recipient to adam.maskini@forju.at; it never
accepts a visitor-specified recipient or forwards the conversation.

Set `PROJECT_FROM_EMAIL` on Render to a sender on a domain verified for the
existing Resend key. A non-sandbox `FEEDBACK_FROM_EMAIL` can also serve as the
sender if the project-specific setting is absent. The sandbox sender only works
in the explicit private account-owner test mode above after the account email is
verified. No changes to the official ForJu website are necessary.

After saving the setting and redeploying, GET `/api/project-submission` should
return `{"direct":true}`. This checks configuration, not delivery. When the sender is unavailable, the form shows its status and keeps the draft
in the current tab. Pressing Send rechecks availability. Failed sends
retain the draft; retries use the same provider idempotency key for identical
content. A provider ID confirms acceptance for delivery, not inbox receipt.
Use mocked transport for automated tests. Real delivery checks require the user's
explicit request and clearly labelled synthetic messages.
