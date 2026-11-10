# Production-readiness assessment — 10 November 2026

**Verdict: useful functional beta, suitable for a supervised private trial; not
ready to recommend as ForJu's unattended public visitor assistant.** This is an
assessment of candidate `f9e4282`, not a new release or a deployment approval.
No application code, account setting or production service was changed.

ForJu's described needs are a bounded website assistant: explain offers, help
schools and young people find the right contact, and prepare project enquiries.
The current architecture is a reasonable fit for that scope. There is no
evidence that a large new platform is needed. However, I have no ForJu traffic
analytics, expected chatbot adoption, peak concurrency or staffed inbox metrics.
I cannot certify suitability for its actual traffic from the website's size or
appearance.

## New visitor observations

In the real Chrome widget on a separate-origin browser-only preview, three
synthetic 16-year-olds in Germany asked about measuring water quality and getting
funding or equipment. The AI distinguished requesting equipment from confirmed
availability, and funding mediation from direct sponsorship. On follow-up it
did not promise eligibility or invent a deadline. The visitor opened the public
resources page and reopened the conversation successfully. That is useful,
appropriate behaviour. The first answer was quite long for a small chat window;
it also could have flagged the country/age uncertainty sooner.

The next phone-viewport question was: “I want to volunteer, but I only have two
hours a month and cannot travel to Vienna. Is there anything I can do?” The AI
trial allowance had been exhausted, and the route returned `budget-limit` with a
local answer. It described a remote Chief of Staff role requiring 2–5 hours per
week. It qualified that role's conditions but did not resolve the visitor's
two-hours-per-month constraint or suggest asking about smaller commitments.
The page remained functional, the jobs link opened, and close/reopen worked.
**Functional recovery passed; conversational usefulness was insufficient.**

The first browser test correctly failed its requirement for an actual AI answer
on that third question. A second browser check captured the fallback, its reason
and its visible result; it did not reset or increase the allowance.

[Fresh AI conversation](release-evidence/2026-11-10-readiness/fresh-ai-browser.json)
· [Fallback conversation](release-evidence/2026-11-10-readiness/budget-fallback-browser.json)
· [Desktop](release-evidence/2026-11-10-readiness/fresh-desktop.png)
· [Phone viewport](release-evidence/2026-11-10-readiness/fallback-mobile.png)

## Readiness by area

| Area | Assessment |
| --- | --- |
| Branded embedded UI | Good pilot candidate. Existing cross-browser, keyboard, form and recovery tests provide useful evidence. Actual ForJu installation and a physical phone keyboard remain unverified. |
| AI answers for ordinary ForJu needs | Useful in the small live sample. Names, corrections, follow-ups and unknown costs/dates worked. Not enough evidence for a broad accuracy percentage or comparison with AMS. |
| Grounding | Only approved records/links enter the model context, but checking a valid passage ID does not establish that the claim follows from it. A synthetic validator-only probe with invented universal free workshops and eligibility was accepted when paired with a real workshop passage. This was NOT a model hallucination observed in chat. It demonstrates the boundary of the validation. |
| Degraded operation | Needs improvement. Budget exhaustion silently reduces conversational ability. The volunteering example failed to address a key constraint. |
| Capacity and spend | Current settings are trial-sized. The $0.25 default reservation allowance fits approximately 23 short German or 28 short English answers per day before history, shared by all visitors. This is conservative reserved capacity, not the actual price or model capacity. Five-question visits could exhaust it after roughly four to five visitors. HTTP limits separately allow 12 requests/minute and 300/day globally; per-client limits depend on a trusted ingress header. |
| Hosting responsiveness | A read-only request to the public project's configuration endpoint took 23.974 seconds; the next took 292 ms. Two samples are not an uptime measurement and do not prove the cause. The documented free Render configuration permits idle shutdown and loses local counters on restarts. |
| Project and feedback delivery | Local provider fixtures passed. The public configuration endpoint returned `direct:true`, which only says settings exist. No real report or project was sent in this assessment, and inbox delivery was not verified. The documented recipient is the personal iCloud inbox used for testing, not an established organisation-owned workflow. |
| Operations | A build and rollback path exist. Current health checking is the homepage; it does not establish that the AI key, available allowance or delivery service works. I did not verify an alerting process for degraded answers, exhausted budget or failed delivery. |

[Recorded probes and timing](release-evidence/2026-11-10-readiness/probes.json).

Render documents a roughly one-minute startup after free-service idle shutdown,
ephemeral storage, and recommends against free instances for production. That
is a practical concern even for low traffic: sparse visits can encounter more
cold starts. [Render's free-service documentation](https://render.com/docs/free).

## How much confidence the tests justify

The previous 122 unit tests, 126 Promptfoo cases and 224 browser cases cover many
important regressions, but the large offline suite uses local answers. It is
not hundreds of live AI conversations. Sixteen successful selected live AI
responses from the implementation pass, plus these two new German answers, are
encouraging and limited evidence. They were reviewed by the implementing agent,
not independently evaluated with ForJu visitors. Answer length, awkward compound
questions, long conversations and source support still need a broader live set.

## Minimum work before an official website rollout

1. Make graceful degradation useful: preserve the visitor's constraints, avoid
   presenting an unsuitable offer as a solution, and offer a concise honest
   contact route when flexible answering is unavailable. Size the allowance and
   quotas for an explicit traffic assumption; retain effective spend controls.
2. Verify an always-available hosting arrangement within the agreed budget, with
   durable quota accounting and practical detection of AI/delivery failures.
   Do not silently upgrade a plan or pretend a local test demonstrates uptime.
3. Broaden the live AI regression set before launch: multi-constraint questions,
   longer exchanges, changing names/topics, ineligible or uncertain requests,
   prompt injection, and claim-level source review. Require that critical facts
   such as fees, eligibility and availability stay uncertain when unpublished.
4. Finish the actual-host handoff: rotated private API key, deployed AI mode,
   relevant visitor privacy information, real ForJu embed/phone test and one
   authorised test receipt in the intended staff inbox. Confirm who responds.

The next decision should be whether those acceptance conditions pass, not an
arbitrary percentage score. The existing product is worth trialling; the current
degraded behaviour and operational setup are the reasons to delay an official
unattended launch.
