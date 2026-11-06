# Public knowledge maintenance

On 6 November 2026 the 24 German sitemap pages were collected again and compared
with the earlier snapshots. Partner, team and contact information was reviewed.
The catalog now has 45 bilingual entries: 37 website topic summaries, five job
categories covering 23 roles displayed on the jobs page, and three historical
LinkedIn summaries. Jobs describe a dated listing, never guaranteed availability.
Facebook is not indexed. English catalog answers are reviewed English summaries.

With COMPASS_LOCAL_ONLY=true, POST /api/chat calls localKnowledge and
selectCatalogKnowledge, then libraryReply reads the winning record’s content or
contentEn. sourceUrl supports the answer; requestUrl, when present, opens the
specific public enquiry form. For example, a class asking to borrow a device
to measure air quality maps to ressourcen. Device availability and price must
be confirmed by the team. Refreshing the JSON and deploying main updates
this path without a database import.

## Privacy and answer presentation

Only entries with public provenance are eligible. Retrieval requests embeddings
for those exact catalog index titles, not a global top-k search across the
legacy documents table. Old private rows are preserved in the database but are
never loaded into chat or search. The uploaded internal document is not part of
the active catalog or the public knowledge pages.

Paragraph evidence IDs stay inside the server. The model may propose zero to
three useful read-more IDs; validation requires that each is actually used by
the answer. URLs come from the reviewed catalog, never model-generated URLs.
Duplicate URLs are removed. No visible numbered citation markers are appended.

Historical project descriptions do not establish current availability. Podcast,
Wissensbase and expert-board announcements remain labelled as planned. Social
updates are treated as reports, not evidence of future events. The official
site's privacy statement is not the Compass privacy statement.

## Refresh

1. Run `python3 scripts/collect-public-website.py` from the project root. Raw public
   snapshots stay in ignored `work/public-crawl/`.
2. Review and paraphrase useful topics into `knowledge/catalog.json`. Keep source
   URL, source publication/update date where known, review date and status. Do
   not copy private material, login-only posts, navigation or related-article
   boilerplate. Social publication dates must not be inferred from crawl dates.
3. Recompute SHA-256 of changed content and its versioned indexTitle. Retire stale
   entries. Review time-sensitive entries monthly, sooner for known changes.
4. In the default catalog-only release the reviewed JSON ships with the build.
   Skip remote imports. Only the optional external AI mode uses Supabase vectors.
5. Run `npm test`, `npm run lint`, and `npm run build`. Exercise German and English
   questions about workshops, funding, planned projects and unrelated subjects.

## Runtime status — 6 November 2026

Direct public catalog search works without external credentials. Chat uses
semantic matches when available, and locally ranked catalog entries when vector
retrieval fails. When generation fails, the response is identified as a catalog
answer and uses a reviewed summary in the selected language. Unmatched questions
get a clarification instead of an invented answer.

The earlier 38 entries had been embedded in September. In this run OpenAI
rejected the configured key (401) and the Supabase connection failed. The new
and updated entries are live in the local catalog; a fresh remote import and
live generative evaluation still require working credentials/connectivity.
See [embedding and integration](embed.md) for host configuration.

The dialogue layer in `lib/dialogue.ts` recognizes short requests in English and
German with MiniSearch 7.2.0 ([MIT license](licenses/minisearch.txt)). It indexes
bundled example phrases in server memory. Visitors can type an answer or tap a
suggestion. A follow-up carries a catalog topic ID alongside the existing short
history; only a reviewed catalog entry can supply facts or links. In local-only
mode, neither MiniSearch nor chat calls a model provider or an external search
service. There is no separate index to host or refresh.

### Answering specific visitor questions

School workshop records carry short German and English phrases for classroom
situations. These are search examples. The answer and its link come from the
reviewed workshop record. If two themes fit, visitors can choose either or
both, then use the published booking contact. To update a theme, read the
[school workshop article](https://forju.at/de/projects/schulworkshops) before
changing its description or example phrases.

Some catalog records contain bilingual `visitorAnswers` for specific questions.
An optional `also` array points to supporting public records, so a combined
answer can show both original pages. The funding service and the donation
campaign describe different things. Keep the campaign’s spending goals separate
from eligibility for reimbursement or an individual award.
[Funding service](https://forju.at/en/services/finanziell) ·
[Donation FAQ](https://forju.at/en/spenden)

Partnership offers and requests to borrow equipment have separate destinations.
Check the named contact on the partnership form before updating `publicContact`.
[Partnership form](https://forju.at/en/kontakt?intent=partner) ·
[Equipment service](https://forju.at/en/services/ressourcen)
