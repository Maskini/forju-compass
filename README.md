# ForJu Compass

Bilingual visitor assistant for ForJu. The standalone page and the embeddable
chat use the same server route and reviewed public knowledge catalog.

## Run a clean checkout

Use Node 24.21.0, then run:

```sh
npm ci --include=dev
npm test
npm run build
npm start -- --hostname 0.0.0.0
```

Next uses PORT (default 3000). No environment file, external provider key,
database import or document upload is needed for catalog-only chat. The server
needs write access to its quota database under work/ (or COMPASS_QUOTA_DB).
External AI is opt-in via COMPASS_LOCAL_ONLY=false and server credentials.
Feedback delivery has separate server-only settings.

See [installation](docs/embed.md), [release and rollback](docs/deployment.md), [updating approved content](docs/public-knowledge.md) and the
[visitor release checks](tools/visitor-checks/README.md).
