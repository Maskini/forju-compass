# ForJu Compass

ForJu-branded prototype knowledge assistant built with Next.js, React and
TypeScript. Server routes use OpenAI, Supabase retrieval and Resend email.

## Local development

Install with `npm ci`, configure server-only variables from `.env.example` in
`.env.local`, then run `npm run dev`. Never commit real environment files.

Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Production: `npm start`.

## Public prototype

The public demo uses summaries of the public ForJu website, with source links.
Original document-derived knowledge is kept only in ignored local `work/` files.
The demo does not confirm funding, booking conditions or availability.

`render.yaml` configures a free Render Node Web Service and automatic deploys
from private GitHub `main`. See [deployment status and setup](docs/deployment.md).
Free hosting sleeps while idle; external API usage may have separate charges.

Feedback can use the explicitly configured prototype account-owner recipient.
See [feedback implementation](docs/feedback.md) and [knowledge maintenance](knowledge/README.md).
