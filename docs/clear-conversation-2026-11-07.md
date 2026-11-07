# Clear conversation — 7 November 2026

The widget header now has a ForJu-styled trash button between expand and close.
The standalone chat also exposes the same action. German and English confirmations
initially focus Cancel; Escape cancels without closing the chat. Focus returns to
the trigger. Confirming removes this chat's turns, input, errors, unsent project
form and report state. Pending chat requests are aborted, and their late results
cannot restore the previous conversation or interfere with a new request. Already
sent reports and projects are not recalled, as the confirmation explains.

Verification on the production build, using synthetic local data:

- 78 unit tests passed; lint passed with 10 existing warnings, no errors.
- 22 Chrome visitor tests passed, including six new clearing journeys.
- 98 browser journeys passed in the network-isolated release environment:
  desktop Chromium, Firefox and WebKit, plus mobile viewports. This includes
  cancellation, project reset, empty history on the next request, session isolation,
  delayed replies and axe-core checks of the confirmation.
- Separate-origin widget installation, existing project/report retry journeys,
  embed-origin rejection and unsafe-input checks also passed.
- Server outbound request log empty. Mail delivery used the local fake receiver;
  no real email was sent. AI-backed mode and physical phone keyboards were not
  tested in this pass.
- Local preview on port 4262 was rebuilt and restarted. German desktop and English
  phone-size views were opened in Chrome; screenshots and clear-state results are
  under `work/trash-release/verification/browser/` in the primary checkout.

Repeat the focused tests after `npm run build`:

```sh
npm --prefix tools/visitor-checks test -- --grep 'Clear conversation'
```

Run all visitor checks with `npm run test:visitors`. The full isolated release
suite, including these new tests, remains `npm run test:release` (local Docker).
Raw results for this pass are in `work/trash-release/verification/` in the primary
checkout. Changes are local; this pass did not deploy to Render or modify ForJu.
