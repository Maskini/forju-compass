# ForJu Compass

ForJu Compass is an AI knowledge assistant being developed as a prototype for ForJu.

## Development principles

- Preserve existing functionality and ForJu branding.
- Keep the UI responsive on desktop and mobile.
- Never commit real `.env` files or expose secrets; `.env.example` contains names and placeholders only.
- Keep server-side secrets server-side; never put credentials in `NEXT_PUBLIC_` variables.
- Prefer maintainable, simple solutions; do not rewrite working functionality without a reason.
- Run the production build before completing major changes.
- Fix TypeScript/lint errors caused by your changes.
- Keep deployment compatibility in mind.
- Do not publish internal ForJu documents or knowledge without explicit publication clearance.
- Do not modify the official ForJu site or DNS as part of this prototype.

## Stack and commands

Next.js App Router, React, TypeScript, CSS/Tailwind, Node.js 24, npm lockfile.

Server API routes use OpenAI for embeddings and answers, Supabase for vector retrieval,
and Resend for feedback. No application authentication is currently implemented.

- `npm ci`: install locked dependencies.
- `npm run dev`: localhost development.
- `npm test`: request, retrieval, citation and feedback tests.
- `npm run lint`: ESLint.
- `npx tsc --noEmit`: TypeScript check.
- `npm run build`: production build.
- `npm start`: production server; respects the host's PORT environment variable.

Render uses a Node Web Service described in `render.yaml`, with automatic builds
from the `main` branch. Read `docs/deployment.md` before changing deployment
configuration.

Knowledge import scripts write to Supabase. Confirm the intended dataset and
environment before running them.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
