# AMS reference and Compass decision help — 10 November 2026

## Conclusion

AMS is a useful interaction reference. This pass improves a specific weak point
in Compass: helping visitors choose without knowing ForJu's service names. It
does **not** establish equivalent or superior overall answer quality to AMS.
The application changes are local and have not been deployed.

## What was verified about AMS

The [official AMS Berufsinfomat page](https://www.ams.at/arbeitsuchende/aus-und-weiterbildung/berufsinformationen/berufsinformation/berufsinfomat)
says it uses ChatGPT for dynamic answers. It documents adjustable answer length,
forms of address, follow-up settings, multilingual questions, conversation reset
and feedback. The [AMS data-processing description](https://www.ams.at/organisation/ueber-ams/datenschutzbestimmungen/informationen-zu-spezifischen-datenverarbeitungen-im-ams)
describes separately managed knowledge and question analysis, retrieval and answer
generation, together with editorial maintenance.

In the actual browser, I observed the embedded AMS welcome, example questions,
message field, delete-history, settings and close controls at a narrow viewport.
I entered one synthetic career question. Browser control could not activate its
send button; the direct iframe URL also refused standalone access. I did not
bypass that restriction. **No AMS answer was obtained**, so this is a documented
interaction reference, not a head-to-head test of actual AMS responses. No private
visitor conversation was sent to AMS.

## Changes in Compass

| Behaviour | Reference or observed gap | Implemented result |
| --- | --- | --- |
| Help deciding | AMS documents follow-up questions; Compass lost context on ordinary uncertainty | Explain the available choices in plain German or English, then ask one useful question |
| Selection after explanation | “The first one” lost the earlier menu | Retain option order after explanation and language changes |
| Still unsure | Repeating the same menu does not help a visitor decide | Ask for the goal in their own words and offer the ForJu team |
| Real next step | Choice must lead beyond a pleasant answer | Equipment follow-ups retain unknown pricing; workshop follow-ups reach the published contact |
| Existing window controls | AMS shows clear/settings/close controls | Preserve Compass's existing clear, close, movement and scroll behaviour; covered by regression journeys |

No theme, form, mail configuration, knowledge facts or public site was changed.
`lib/dialogue.ts` supplies the new navigation explanations through the existing
`/api/chat` route. Selection returns to the reviewed catalog. The application does
not treat its own explanation as evidence of eligibility, inventory or booking.
Existing MiniSearch is reused; no package, inference service or production network
destination was added. The new code is project code, not copied AMS code.

## Measured journeys

Independent fixtures live in
`tools/knowledge-checks/decision-help-cases.json`. They test required facts,
unknowns, topic selection and exact supporting links through the production HTTP
entry point, with `COMPASS_LOCAL_ONLY=true`, synthetic data and isolated quotas.

- Six development scenarios: **1/6 before → 6/6 after**.
- Four additional reserved scenarios: **4/4 after**, with no further application
  tuning. These include changing topic and requesting advice without any context.
- A fresh session cannot inherit another visitor's “second option”.
- Switching to English preserves the current decision before choosing.

Example verified journey:

1. “Ich bin Lehrerin” → Compass offers workshop, equipment and funding choices.
2. “Ich weiß noch nicht, was am besten passt.” → Compass explains when each may
   help, without selecting an offer or making a promise.
3. “Das erste” → the school-workshop offer.
4. “Und wie melde ich meine Klasse dafür an?” → `anja.hofer@forju.at`, supported
   by [ForJu's school-workshop page](https://forju.at/de/projects/schulworkshops).

The before, after and reserved-case answers are kept in
`docs/release-evidence/2026-11-10-decision-help/`. Browser tests cover the same
journey on the standalone app and a widget on a separate local origin, in German
and English, desktop Chromium/Firefox/WebKit and mobile WebKit. These are local
checks, not checks on the actual ForJu production website or a physical phone.

Repeat the suite from the repository root with:

```sh
npm run test:release
```

## Limits and next release checks

Compass's local-only engine has reviewed responses and targeted routing; it does
not have AMS's generative dialogue. Matching the latter's broad conversational
flexibility requires a suitable inference setup and evidence from harder, unseen
multi-turn conversations. No such setup was enabled here: existing zero-additional-
cost and visitor-data boundaries are preserved. The previous multilingual MiniLM
experiment remains excluded from production after exceeding the tested free-tier
memory budget; an embedding model alone would not generate flexible replies.

No real emails were sent. Local fixtures check acceptance/retry/idempotency, not
arrival in a real inbox. Production ForJu embedding and intended inbox delivery
remain live release checks. Existing reviewed ZAP warnings are not erased by a
passing regression gate. The complete run and any corrected test expectation are
recorded with the evidence rather than hidden.

## Final local checks

- 110 unit tests, 126/126 Promptfoo cases and 224/224 browser journeys passed.
- Zero browser skips, unexpected failures or retries. Production build, lint,
  catalog checks, targeted security, load and monitored egress checks passed.
- The first full run flagged one test-oracle issue: the volunteer answer included
  its legitimate official jobs link, absent from the new fixture allowlist. The
  exact URL was added; all quality cases, unit tests and build passed again in a
  fresh isolated container. The original failure remains in `status.tsv`; the
  corrected results and explanation are in `summary.json` and
  `fixture-correction.json`. Application code did not change for this rerun.

Verified local widget views: [desktop](release-evidence/2026-11-10-decision-help/chromium.png)
and [mobile](release-evidence/2026-11-10-decision-help/mobile-webkit.png). The desktop
host is a separate-origin integration fixture, not the official ForJu site.
