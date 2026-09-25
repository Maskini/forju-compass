# Deployment

## Current status

ForJu Compass is deployed as a prototype on Render.

Live demo:
https://forju-compass.onrender.com

The application is configured for automatic deployment from the `main` branch.

## Architecture

ForJu Compass is built with:

- Next.js 16 App Router
- React 19
- TypeScript
- Node.js 24
- OpenAI for embeddings and grounded AI responses
- Supabase for vector-based knowledge retrieval
- Resend for feedback email delivery
- Render for hosting

AI and database operations are handled through server-side routes. Sensitive
credentials are not exposed to the browser.

Requests use relative same-origin API URLs.

## Render configuration

`render.yaml` defines a Node Web Service with:

- `main` as the deployment branch
- automatic deployment on commits
- `npm ci --include=dev && npm run build`
- `npm start -- --hostname 0.0.0.0`
- health checks on `/`
- Node.js 24.21.0

Render's free hosting tier may sleep when idle. External services such as
OpenAI may have separate usage costs.

## Environment variables

No browser-exposed environment variables are required.

Required server-side variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Feedback-related variables:

- `RESEND_API_KEY`
- `FEEDBACK_FROM_EMAIL`
- `FEEDBACK_TO_EMAIL`

Optional configuration:

- `OPENAI_CHAT_MODEL`
- `FEEDBACK_IP_HEADER`

Sensitive values must be configured through Render's environment settings and
must never be committed to Git.

## Security

The public prototype is designed to use only approved public-source knowledge.

Current protections include:

- server-side API credentials
- environment files excluded from Git
- restricted knowledge retrieval
- input validation
- AI request rate limiting
- feedback validation and rate limiting
- HTML escaping and URL sanitization
- generic outward-facing error responses

The public repository must not contain private ForJu documents, credentials,
API keys, or internal-only datasets.

## Deployment workflow

1. Push changes to the `main` branch.
2. Render automatically starts a new deployment.
3. Verify that the build succeeds.
4. Test the deployed application:
   - homepage and navigation
   - responsive/mobile layout
   - AI chat
   - knowledge retrieval
   - source pages
   - feedback submission
   - error handling

## Prototype status

ForJu Compass is an active prototype and does not represent the final planned
scope of the project.
