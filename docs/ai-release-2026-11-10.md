# Flexible conversation: verified local candidate

**Decision: ready for a supervised AI trial, not yet a public AI rollout.**
The production build now gives real OpenAI answers through the normal `/api/chat`
entry point. The website widget and standalone app share this implementation.
Nothing was pushed or deployed in this pass; the existing public Render site was
not changed. No real project or feedback email was sent.

## What changed and why

Previously, fixed handlers could answer before the model was reached. The new
AI-enabled path receives the original question, recent conversation and 46
approved public records in one bounded Responses call. It handles greetings,
names, corrections and follow-ups while selecting supporting passages and links.
`COMPASS_LOCAL_ONLY=true` still makes no provider calls.

The server resolves links from approved records and rejects invalid evidence,
unrecognised contacts and common fabricated submission confirmations. The model
has no mail or submission tools. Compass's six-step form and ForJu's official
contact form are explicitly distinguished. Search remains local in both modes.

Tests exposed real defects in the first implementation: paraphrased source
quotations caused needless rejection; a rejected answer could fall through to
an irrelevant keyword match; useful contact links could be rejected; and an
internal evidence annotation leaked into prose. These were fixed and the
affected checks rerun. Evidence selection now uses server-owned passage indices
instead of requiring the model to reproduce quotations.

## Evidence

| Check | Result and boundary |
| --- | --- |
| Real OpenAI, German and English | Eight scenario turns passed: school workshop, Vienna-to-Graz correction, booking contact, unconfirmed date/price, classroom measuring equipment, name correction, inquiry wording and refusal to claim it was sent. [Actual answers](release-evidence/2026-11-10-ai/live.json). |
| Fresh questions after fixes | Four turns passed, including `my nam e is Adam`, a class robot idea, a request to send it, and unrelated software text. The final rerun removed the evidence-label leak and distinguished the two project forms. [Actual answers](release-evidence/2026-11-10-ai/holdout.json). |
| Real browser with live AI | Desktop Chrome and a 390 × 844 phone viewport: four answers, follow-ups, actual public source navigation, close/focus return and reopening the same exchange. This was a labelled browser-only, separate-origin host preview, not an installation on forju.at. [Results](release-evidence/2026-11-10-ai/results.json), [desktop](release-evidence/2026-11-10-ai/desktop.png), [phone viewport](release-evidence/2026-11-10-ai/mobile.png). |
| Final code checks | 122 unit tests passed; production build passed; lint had zero errors and ten existing warnings. [Unit](release-evidence/2026-11-10-ai/unit-final.log), [build](release-evidence/2026-11-10-ai/build.log), [lint](release-evidence/2026-11-10-ai/lint-final.log). |
| Full offline regression in this session | 126 Promptfoo cases, 224 Playwright cases across Chromium/Firefox/WebKit/mobile WebKit, plus six Firefox stability checks passed. Project/report delivery used local fixtures, not an actual inbox. Security, load, baseline scan and blocked-egress gates passed. [Status](release-evidence/2026-11-10-ai/offline-status.tsv), [quality](release-evidence/2026-11-10-ai/offline-quality.log), [browsers](release-evidence/2026-11-10-ai/offline-browser.log). |

The full offline run preceded the final AI-only passage-validation and wording
polish. Final unit/build/lint and the four fresh live turns were rerun afterwards.
Offline tests do not establish AI quality. Live checks verify deterministic
expectations and were also read against the approved catalog for claim support;
they are a small sample, not a guarantee for every future response.

The ZAP gate accepts two previously reviewed medium warning categories:
`style-src unsafe-inline` and absence of a conventional HTML CSRF token on the
JSON form. Targeted origin/content-type checks pass. This is not a claim of zero
scanner findings or a penetration test. [Findings](release-evidence/2026-11-10-ai/zap-findings.log).

## Examples from the actual browser trial

- German follow-up: “Und wie melde ich meine Klasse dafür an?” → “Schreib Anja
  Hofer an anja.hofer@forju.at und nenne das gewünschte Workshop-Thema. Frag sie
  dabei nach einem passenden Termin für deine Klasse; aktuelle Kosten und die
  Durchführung solltest du ebenfalls bestätigen lassen.” The opened supporting
  page was [Schulworkshops](https://forju.at/de/projects/schulworkshops).
- English follow-up: “What would that cost us?” → “ForJu’s resources page does
  not give a loan price. The cost for a sensor and your requested dates would
  need to be confirmed by the team.” The opened page was
  [Rooms and equipment](https://forju.at/en/services/ressourcen).
- Fresh typo: “my nam e is Adam” → “Nice to meet you, Adam! How can I help you
  today?” No irrelevant factual citation was attached.

## Cost, privacy and remaining release checks

No new service or dependency was added. The existing OpenAI SDK is Apache-2.0;
MiniSearch and Zod are MIT. Existing browser/evaluation tools remain development
tools. No AMS code was reused. See the
[architecture and repeat commands](ai-conversation.md).

Live tests used synthetic data and the existing OpenAI API, so they can consume
API credits. They used an isolated $0.50 conservative reservation ledger, with
no automatic retries or embedding calls. The application default is $0.25/day.
These are single-host application controls, not a verified provider billing cap;
the actual invoice and provider account limits were not checked. On free Render,
ephemeral disk/redeploys can reset that ledger. No paid hosting, subscription or
account billing setting was added or changed.

AI mode sends the question, up to four recent exchanges, a shared name if any,
and public evidence to OpenAI with `store:false`. That is not zero provider
retention. The visitor notice was updated. Synthetic diagnostic capture was
disabled before leaving the preview running. Keys stay in ignored server-side
configuration, not the repository, browser bundle or embed snippet.

Before public AI use:

1. Rotate the temporary key shared in chat. Configure its replacement privately
   on the existing host, deploy this candidate and explicitly enable AI mode.
   Review provider budget controls and the site's privacy information. A laptop
   environment change does not change Render.
2. Repeat the bounded live checks against the deployed configuration using an
   appropriate staging check; the supplied live runner deliberately only accepts
   loopback URLs. Check a real phone keyboard and the actual ForJu host embed.
3. Verify intended inbox delivery separately if forms are part of the trial.
   This pass verified their existing local fixtures, not real inbox delivery.

Passage references and pattern guards cannot prove factual entailment. Public
content still needs review as offers change; long conversations beyond the
bounded history can lose context. AI mode was exercised live in Chrome; the
other engines were exercised with local answers. Those limits remain explicit.

Update content through the existing `knowledge/catalog.json` review workflow.
Rollback inference by setting `COMPASS_LOCAL_ONLY=true` and restarting: the same
embed and local answers remain. For code rollback, revert this release commit;
the existing hosting procedure is in [deployment.md](deployment.md).
