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

FEEDBACK_LOCAL_TEST works only in development. Render explicitly enables
FEEDBACK_DEMO_MODE=true, which permits only the fixed account-owner recipient
adam.maskini@icloud.com and onboarding@resend.dev sender. Provider delivery
must be verified from the deployed service. Do not change ForJu DNS.

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
sender if the project-specific setting is absent. The demo sender cannot send
to the ForJu inbox. No changes to the official ForJu website are necessary.

After saving the setting and redeploying, GET `/api/project-submission` should
return `{"direct":true}`. This checks configuration, not delivery. When the sender is unavailable, the form shows its status and keeps the draft
in the current tab. Pressing Send rechecks availability. Failed sends
retain the draft; retries use the same provider idempotency key for identical
content. A provider ID confirms acceptance for delivery, not inbox receipt.
Use mocked transport for tests; do not send test emails.
