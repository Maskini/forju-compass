# Public demo knowledge

`catalog.json` contains summaries based on publicly available ForJu website content.

Every entry links to its public source. Private or internal ForJu documents are not included in the public knowledge catalog.

The importer adds current demo entries and does not delete existing database rows.

Retrieval accepts only the exact index titles defined in the public catalog and uses approved catalog content rather than arbitrary raw database records. This prevents unrelated or private records from becoming citations in the public prototype.

Run:

```bash
npm run knowledge:import
```

to preview the import plan.

Use:

```bash
npm run knowledge:import -- --apply
```

to insert missing embeddings.
