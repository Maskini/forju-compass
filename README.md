# ForJu Compass

ForJu Compass is an AI-powered knowledge assistant prototype developed for ForJu.

It helps users discover relevant information, services and projects through a conversational interface backed by structured public-source knowledge.

Live demo: https://forju-compass.onrender.com

## Features

- Conversational AI interface
- German and English support
- Retrieval-augmented generation (RAG)
- Semantic search
- Source-linked answers
- Structured knowledge catalog
- Responsive desktop and mobile interface
- Feedback and issue-reporting system

## Tech stack

- Next.js
- React
- TypeScript
- Node.js
- OpenAI
- Supabase
- Resend
- Render

## How it works

The application uses server-side API routes for AI and database operations.

```text
User
  ↓
Next.js interface
  ↓
Server API
  ↓
OpenAI embedding
  ↓
Supabase retrieval
  ↓
Approved knowledge
  ↓
Grounded AI response
```

The public prototype uses approved public-source ForJu knowledge.

Private ForJu documents, credentials and internal-only datasets are not included in the public repository.

## Security

The prototype includes:

- server-side API credentials
- environment files excluded from Git
- restricted knowledge retrieval
- input validation
- AI request rate limiting
- feedback validation and rate limiting
- URL sanitization
- HTML escaping
- generic public-facing error responses
- disabled public ingestion and diagnostic endpoints

## Local development

Install dependencies:

```bash
npm ci
```

Create `.env.local` using `.env.example` as a reference.

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment variables

Required:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
```

Feedback:

```text
RESEND_API_KEY
FEEDBACK_TO_EMAIL
FEEDBACK_FROM_EMAIL
```

Optional:

```text
OPENAI_CHAT_MODEL
FEEDBACK_IP_HEADER
```

Real environment values must never be committed to Git.

## Development checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

The prototype is deployed on Render and automatically rebuilds from the `main` branch.

See:

- [Deployment documentation](docs/deployment.md)
- [Feedback documentation](docs/feedback.md)
- [Knowledge maintenance](knowledge/README.md)

## Status

ForJu Compass is an active prototype and will continue to evolve in areas such as knowledge coverage, retrieval quality, integrations and additional product features.
