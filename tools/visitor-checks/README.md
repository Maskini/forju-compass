# Compass visitor checks

Run these checks before releasing chat or catalog changes. Use Node 24 and a local installation of Google Chrome. The test tools have their own lockfile and run only on the maintainer’s computer. The visitor app has no dependency on this package.

From the Compass repository root:

```sh
npm ci
npm ci --prefix tools/visitor-checks
npm run check:release
```

The runner starts the production build on 127.0.0.1:4196 with catalog-only chat, an isolated quota database, and synthetic conversations. It closes the server and removes the quota file when finished. Leave this port free. To test a production build in a different checkout, set COMPASS_PROJECT_DIR to its absolute path. The dependency installation needs internet access. The release check runs lint, unit tests, a production build, then the browser suite. Browser traffic is restricted to the local app and test fixtures. Only /api/chat accepts POST requests. No email is sent. To add Firefox coverage, run `(cd tools/visitor-checks && npx playwright install firefox)` and then `COMPASS_TEST_BROWSER=firefox npm run test:visitors`. Use `webkit` in both commands for the optional iPhone emulation. Reports for these browsers go in `report-firefox` and `report-webkit`.

Open `tools/visitor-checks/report/index.html` for the results, failed expectations, and axe findings. A failing journey returns a nonzero exit code. The assertions check specific outcomes and allow wording variations. Review the responses when an assertion fails.

| Check | What passing means |
| --- | --- |
| German workshop conversation | The follow-up addresses whether the workshop can take place in Graz, explains that regional coverage requires confirmation, and links to the workshop page. |
| English equipment enquiry | Asking for an email yields a usable draft that mentions air quality and March and stays with the equipment enquiry. |
| Standalone homepage | A German enquiry about a class workshop becomes an editable email to the public workshop contact, keeping the town and topic. |
| Embedded widget | A visitor can open by keyboard, ask a workshop question and a registration follow-up, close with Escape, regain focus, and reopen the same exchange. The fixture presents separate HTTPS origins to the browser and serves both locally; it does not change or contact the ForJu website. |
| Accessibility | axe-core checks a chat with a German answer and the open English project draft at a phone viewport for serious or critical WCAG 2.0/2.1 A and AA findings. Also try the real phone keyboard and a screen reader when releasing UI changes. |

## Check the catalog links

With the optional Lychee CLI installed, run these commands from the repository root:

```sh
npm --silent --prefix tools/visitor-checks run sources | lychee --no-progress --max-concurrency 3 --max-retries 0 --timeout 15 -
```

This sends ordinary read requests for the unique public catalog and enquiry URLs, including the English versions. The input contains only those URLs. A 403 calls for a manual visit. Successful HTTP responses establish reachability. Check the page text separately for changed prices, eligibility, coverage and contacts.

## Baseline on 6 November 2026

Against the local production build of b335e68, three of the five browser checks passed. The Graz follow-up returned climate workshop content, and the English draft request returned a press contact. Keep both as regression cases when extending the catalog. The keyboard journey passed. The two accessibility scans passed the stated threshold. Lychee 0.24.2 received 61 successful responses out of 62 unique URLs. LinkedIn returned HTTP 403 for https://at.linkedin.com/company/forschende-jugend.

The tests and URL export are original code. Tools retain their upstream notices and licenses:

- [Playwright Test](https://github.com/microsoft/playwright) — Apache-2.0
- [axe-core for Playwright](https://github.com/dequelabs/axe-core-npm) and [axe-core](https://github.com/dequelabs/axe-core) — MPL-2.0
- [Lychee](https://github.com/lycheeverse/lychee) — MIT or Apache-2.0
