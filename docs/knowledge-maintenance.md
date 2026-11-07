# Updating Compass knowledge safely

The default release uses `COMPASS_LOCAL_ONLY=true`. The approved JSON catalog,
not a cloud index or an uploaded document, supplies the answers. No model
installation, paid API call, new account or CMS is needed for this workflow.
Run from the repository root with Node 24.21.0.

## Review a source change

```sh
npm ci
npm --prefix tools/knowledge-checks ci --ignore-scripts
npm run knowledge:refresh
```

This fetches only exact HTTPS URLs in `knowledge/public-sources.json`, including
German and English versions. It does not discover or follow arbitrary links.
Scripts and subresources do not run in the extractor. Requests are GETs; forms
are never submitted. Each page has headings, passages, language, publication and
modification dates where explicitly published, useful links, visible form fields,
and a content hash. A crawl date is never used as a publication date.

Read the snapshot path printed by the command (also in
`work/source-review/latest.json`). Its `changes` identify affected catalog IDs.
First-time sources are `unreviewed`; a page shared by several catalog records
remains `partially-reviewed` until each affected record has been checked.
Unchanged pages, changed pages, redirects,
404/410 removals and other failures are distinct. Nothing is published by a
refresh. A dynamic page with insufficient HTML body text fails extraction and
needs a manual rendered-page review. In this run `/de/jobs` and `/en/jobs` have
that limitation. An extraction failure is not proof that an offer was removed.

Edit the relevant records in `knowledge/catalog.json` using the page as evidence.
Keep German and English aligned. Add everyday phrases in `keywords` (and
`visitorPhrases` for workshops) only when they describe the actual offer. Keep
fees, eligibility, device stock and dates unknown unless the source states them.
Keep planned projects and historical social posts clearly labelled. An expired
opportunity should be retired, not silently rewritten as currently available.

After reviewing both language pages and your edits, explicitly name the IDs:

```sh
npm run knowledge:review -- --ids ressourcen,finanzierung
```

The review command refuses failed, removed, redirected or altered snapshots. It
updates the review dates and a versioned hash covering **both languages, guided
answers, keywords, contacts and links**. Reviewed source passages are saved in
`knowledge/source-review.json` so a future diff has an auditable baseline. A
previous catalog and source-review state are backed up under ignored
`work/source-review/backup-*` before writing. Review does not mean submission or
funding approval.

Retire an obsolete record after investigating the source:

```sh
npm run knowledge:review -- --retire obsolete-record-id
```

`active:false` immediately excludes it from local retrieval and the permitted
cloud-vector titles after the next deployment. Historical database rows are not
deleted; they cannot regain access through similarity alone.

```sh
npm run knowledge:check
npm run test:knowledge
npm test
npm run build
npm run eval:knowledge
npm run test:release
```

`knowledge:check` validates catalog provenance, duplicates and reviewed hashes.
If a local refresh snapshot exists, unresolved source changes return a nonzero
exit code and list the affected IDs. New sources without a review baseline also
remain on that list. It prints overdue reviews, including historical social
records, separately. CI has no local crawl cache: its check validates the tracked
catalog, and must not be mistaken for a fresh live-link check.

Commit only reviewed catalog/state/manifest changes and intentional code/tests.
Raw snapshots and evaluation transcripts stay under ignored `work/`. The legacy
Python collector and urlwatch watcher remain available; the structured workflow
above supersedes them for normal updates. Do not run `import-knowledge.mjs` for
the default release: it makes external embedding calls. An explicitly enabled
AI-backed release would need a fresh import of changed version titles and its
own live evaluation; this pass did neither.

## Repeat verification and roll back

`npm run test:release` is the complete local gate. It needs local Docker and can
download public tools/locked packages during bootstrap. The tests then run in a
container with no external network: Promptfoo, real browser journeys, axe-core,
a fake local mail receiver, security checks, k6 and a passive ZAP scan. No real
project or feedback email is sent. See `tools/release/README.md` for prerequisites.

For the focused production-HTTP comparison after building:

```sh
node tools/knowledge-checks/evaluate.mjs after
node tools/knowledge-checks/evaluate.mjs holdout
```

These start a disposable local-only production process on port 4327 and reject
non-loopback HTTP. The quota database is isolated and reset between scenarios;
real rate limiting and recovery are tested separately by k6. Results go to
`work/knowledge-release/`. The original six held-out questions are now known
regressions, not a future blind benchmark. Add new independently sourced cases
before the next evaluation.

Keep changes in a release commit. To undo a published update, revert that commit
and redeploy through the existing host. Reverting the catalog restores its
previous active entries and vector-title allowlist. For an uncommitted local
review, restore **both** JSON files from the same backup directory. Never restore
an old `.env` from a commit or alter the official ForJu site as part of this task.
