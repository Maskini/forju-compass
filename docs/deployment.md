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
OpenAI credentials are optional and used only by AI mode. The new conversation
path uses the reviewed public catalog directly and does not need Supabase. See
[AI conversation architecture and live checks](ai-conversation.md) before enabling
it; a key on the laptop does not configure Render.

Optional server-only configuration:
- OPENAI_CHAT_MODEL: keep the priced model from `.env.example`; other overrides fail closed.
- COMPASS_AI_DAILY_BUDGET_USD: conservative daily single-host allowance (default $0.25).
- RESEND_API_KEY, FEEDBACK_FROM_EMAIL, FEEDBACK_TO_EMAIL: feedback delivery.
- FEEDBACK_IP_HEADER: only a header the hosting proxy reliably overwrites.
- KNOWLEDGE_FEEDBACK_DIR: requires durable private storage; omit on free Render.

Both forms currently deliver to **adam.maskini@icloud.com**, as requested on
9 November 2026. This is the existing Resend account-owner inbox, so the existing
sandbox sender works without changing the account email or ForJu DNS.

```dotenv
FEEDBACK_TO_EMAIL=adam.maskini@icloud.com
FEEDBACK_FROM_EMAIL=onboarding@resend.dev
PROJECT_FROM_EMAIL=onboarding@resend.dev
```

Keep the existing RESEND_API_KEY in Render's private environment settings.
The legacy FEEDBACK_DEMO_MODE and FEEDBACK_LOCAL_TEST flags are ignored. The
configured recipient applies equally to reporting and project inquiries.
Existing Render environment values must also match; a Git push alone does not
prove the dashboard settings changed. Changing these values requires a restart
or redeploy. Missing or invalid recipient configuration fails closed.

To switch to adam.maskini@forju.at later, first obtain an authorized sender on a
Resend-verified domain, then set FEEDBACK_TO_EMAIL to that ForJu address and both
FROM settings to the verified sender. Never silently fall back to another inbox.
The recipient is independent of the Resend login email; keep that login unchanged.

NODE_ENV=production and NODE_VERSION are set by the Blueprint. Secret values
must only be supplied through Render's private environment settings, never Git.

## Live checks

After deployment verify the script, response headers, allowed and denied
parent origins, and a complete conversation on a physical phone. Verify live
feedback delivery separately with an authorized recipient if enabling email.

### Project draft email
On Review, **Send / Senden** submits the edited draft and optional reply address to
the server. The server uses the same FEEDBACK_TO_EMAIL as reporting; it never
accepts a visitor-specified recipient or forwards the conversation.

`PROJECT_FROM_EMAIL` can override the feedback sender; if absent, it reuses
`FEEDBACK_FROM_EMAIL`. The sandbox sender is permitted only with the approved
iCloud recipient. A ForJu recipient requires a verified domain sender.

After saving the setting and redeploying, GET `/api/project-submission` should
return `{"direct":true}`. This checks configuration, not delivery. When the sender is unavailable, the form shows its status and keeps the draft
in the current tab. Pressing Send rechecks availability. Failed sends
retain the draft; retries use the same provider idempotency key for identical
content. A provider ID confirms acceptance for delivery, not inbox receipt.
Use mocked transport for automated tests. Real delivery checks require the user's
explicit request and clearly labelled synthetic messages.

## Trace an email without sending another one

Both mail adapters now write a `[compass-mail]` entry after Resend accepts a
message. It contains only kind (`feedback` or `project`), state (`accepted`),
providerId and timestamp. No form body, address, API key or raw provider error is
logged. The recipient and sender settings above are unchanged.

Find the providerId in the private Render logs, then find that ID in the signed-in
Resend **Emails** dashboard. This works even when the application key is
sending-only. If an existing private key already has read permission, this
optional laptop command prints only delivery metadata:

```sh
node --env-file=.env.local tools/mail-status.mjs PROVIDER_UUID
```

Replace `PROVIDER_UUID` with that message ID. Do not paste an API key into the
command. The tool makes a single authenticated GET to the existing Resend API;
it cannot send or retry a message. A sending-only key receives a clear dashboard
instruction; do not broaden the production key just to run this tool. No new
service, dependency, subscription, paid inference call or automated polling was
added. Lookup remains subject to the existing account's API limits.

`accepted` means the send API acknowledged the message. `delivered` means the
recipient mail server accepted it, not that a person saw it in their inbox.
`bounced`, `failed` or `suppressed` require checking the provider events. Do not
blindly resend: the original may already be delivered. There is no public email
lookup endpoint and no background delivery tracking in Compass.

References checked 9 November 2026:
- https://resend.com/docs/api-reference/emails/retrieve-email
- https://resend.com/docs/dashboard/api-keys/introduction

## Temporary tab recovery

Conversation and project data can survive a refresh using bounded sessionStorage,
with a 30-minute recovery window after the last change. No account, shared server
conversation store or new data destination is involved. Trash clears the current
chat surface and its project record. Browser restrictions fall back to memory;
recovery is not guaranteed when storage is blocked or a browser discards the tab.
The widget still returns closed, at the launcher, after navigation. Reports retain
the existing in-memory retry behavior and are **not** recovered after a reload.
The host site's privacy notice must describe temporary browser storage before
public installation. See [embed.md](embed.md) for details.
