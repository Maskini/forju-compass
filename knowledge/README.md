# Public demo knowledge

catalog.json contains the bilingual records served by Compass. See [public knowledge maintenance](../docs/public-knowledge.md) for the source review and release procedure.
Every entry links to its public source. No strategy-paper excerpts are shipped.
Original document-derived data is preserved locally in ignored work/private-knowledge-before-demo/.

The importer adds current demo entries and never deletes existing database rows.
Retrieval accepts only the exact index titles in this public catalog and uses catalog
text, never raw database content. Unrelated and private records cannot become citations.
Run npm run knowledge:import for a plan; -- --apply inserts missing embeddings.
Local extraction/review/evaluation helpers are archival maintenance tools and require
an explicitly approved dataset before use. Do not re-extract private data for deployment.
