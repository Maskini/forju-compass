# Conversation reliability: logistical follow-ups

This is a focused improvement to the existing catalog-only assistant, not a declaration of full production readiness. No model, service, dependency, paid call or visitor tracking was added. The current host and `COMPASS_LOCAL_ONLY=true` remain unchanged.

## Reproduced failure

The real production `/api/chat` found an offer, then lost it when a visitor asked “Wie lange dauert der?” or “How long can we keep it?”. The generic fallback dropped the topic, so the next question also lost context. Other follow-ups returned a general offer description instead of addressing an age requirement or preparation question.

The route now resolves a complete logistical follow-up separately from its offer. It reads the corresponding reviewed catalog passage, keeps the selected topic and returns the supporting public link. Matching requires a complete relevant question; “How long can we keep the rental car?” cannot inherit a previously discussed sensor. Explicit new topics still use the existing retrieval path. No conversation is stored server-side by this change.

## Public evidence reviewed

Both German and English pages were fetched and read on 7 November 2026. The existing Mozilla Readability/structured-form extractor was reused. No forms were submitted.

| Reference | Confirmed | Still unknown |
| --- | --- | --- |
| [School workshops](https://forju.at/de/projects/schulworkshops) | Topics, Vienna scope, Anja Hofer as contact; dated school-funding description | Workshop duration, minimum/maximum group size, current price for a specific class |
| [Resources](https://forju.at/de/services/ressourcen) | Partner-based space/equipment sharing and coordination | Exact device stock, loan period and price |
| [Membership enquiry](https://forju.at/de/kontakt?intent=mitglied) | Name, email, optional subject and message; introduce yourself and how you want to help | Minimum age and membership fee |
| [Financial support](https://forju.at/de/services/finanziell) | Cost estimation and funding-partner introductions; no direct sponsorship | Blanket age eligibility and mandatory application-document checklist |

Preparation advice is explicitly labelled a suggestion, not an official requirement. Updated catalog passages and bilingual source-review records use the existing content hash/versioning mechanism. No Supabase import was needed: the live local-only route reads this catalog directly.

## Results

Synthetic scenarios sent through the actual production HTTP endpoint with external server traffic blocked and a disposable quota database:

- Focused set: **2/14 before → 14/14 after**. Tests assert topic, supporting URL, necessary facts and prohibited fabrication. This is a targeted regression set, not a general accuracy percentage.
- Four reserved follow-up scenarios: **4/4** on the first post-fix run.
- Existing HTTP knowledge set: **15/15**, with **8/8** existing reserved cases.
- Unit/request tests: **80 passed**.
- Browser journeys: **26 passed** in Chrome, with desktop/mobile viewports, standalone and separate-origin widget previews. New journeys follow an equipment loan-period question, close/reopen the widget, switch to workshops and ask about duration.
- Production build passed. Lint: zero errors, ten existing warnings. Existing knowledge-tool tests passed.

Raw before/after/reserved answers are in `docs/evidence/followups-2026-11-07/`. Build and browser logs are in ignored `work/conversation-reliability/`. Local tests are not evidence of live email delivery or a physical-phone installation. Public deployment verification is saved separately as `work/conversation-reliability/live.json` when completed.

Repeat from the project root after installing the existing locked dependencies:

```sh
npm run build && npm test && npm run eval:followups && npm run test:visitors
```

The evaluator runs the production server locally with `COMPASS_LOCAL_ONLY=true`, empty provider keys and an isolated quota database. Only the evaluator's disposable counters are reset between independent scenarios. The normal application's rate limits are unchanged.

## Remaining release work

The initial exploratory conversations also exposed language-switch requests, generic volunteering-experience/remote-work follow-ups, and a correction from equipment to advice. Those were not part of this fix and remain open. Free-form understanding is still bounded by the local retrieval and conversation rules. Passing this set must not be described as understanding every question.

Project-email delivery still needs an authorized sender and a separately approved live delivery check. The actual ForJu installation and physical-phone keyboard behavior need deployment-specific verification. The public site and its DNS were not modified.

The rollback point for this release is `3241a6f` (the musical CEO-demo release). Use the existing Render Events rollback and revert the corresponding fix commit on GitHub main, as described in `docs/deployment.md`.
