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
