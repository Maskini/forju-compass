# Prototype deployment

## Current status

Prepared locally, not yet deployed. Private repository created: https://github.com/Maskini/forju-compass.
Git upload and Render authorization are in progress. No live URL exists yet.

The production build and 27 automated tests pass. ESLint has seven existing
image optimization warnings and no errors. The candidate Git files and existing
commit were checked for local credential values and common token patterns; none
were found. This is a scoped scan, not a comprehensive security audit.

## Architecture

Next.js 16 App Router, React 19, TypeScript, npm, Node 24. Server routes use
OpenAI embeddings and grounded answers, Supabase `match_documents` retrieval,
and Resend feedback email. There is no user authentication or Supabase browser
client, so no login callback/redirect URL changes are needed. Requests use
relative same-origin API URLs. The official ForJu site and DNS remain untouched.

## Render configuration

`render.yaml` declares a free Node Web Service, repository root, `main` branch,
automatic deployment on commits, `npm ci --include=dev && npm run build`, and
`npm start -- --hostname 0.0.0.0`. Next respects Render's PORT variable.
Node is pinned to 24.21.0, matching the tested local runtime. Render's private
GitHub integration must be connected; do not make the repository public.

Free hosting may sleep when idle and uses ephemeral storage. Existing paid
external API usage is separate from the hosting plan. Do not promise that
OpenAI requests cost zero. Do not enable local-file feedback storage on Render
as though it were durable.

References: https://render.com/docs/deploy-nextjs-app and
https://render.com/docs/blueprint-spec

## Environment variables

No browser-exposed environment variables are required.

Required server-only variables, copied securely from local configuration:
- OPENAI_API_KEY
- SUPABASE_URL (service address, not a secret but kept server-side)
- SUPABASE_SECRET_KEY

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

## Publication checks still required

- Completed: seven public website summaries replace private-document excerpts.
  Originals remain in ignored work/private-knowledge-before-demo. Supabase has
  the seven demo embeddings; all prior rows were preserved.
- Added single-instance AI limits: 12 requests/minute and 300/day shared across
  visitors. Restarts reset these counters; use provider spending limits too.
- Resolve prototype feedback delivery without modifying official ForJu DNS.
- Create the private GitHub repository, push `main`, connect Render and deploy.
- Test public homepage, navigation, mobile layout, chat, Supabase retrieval,
  source pages, feedback, error handling and browser asset secret exposure.
- Verify a subsequent main commit redeploys to the same HTTPS URL.

Do not describe the configuration alone as a completed deployment.
