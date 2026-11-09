# Observed failure before the final focus fix

Run: `20261109T180119Z-final-37744` (local production, isolated Docker).

The browser stage finished with 132 passed and 1 failed. The failure was `Clear conversation / de / standalone / 390` in Chromium. After clearing the conversation, reopening the empty project form, returning to chat and typing `Hallo`, the project dialog was open again and the question remained unsent.

Assertion: the first `[role=log] article .response p` did not appear within 5 seconds. The captured DOM contained an open project dialog and a composer holding `Hallo`.

The delayed native dialog close handler unconditionally focused the project trigger. If the visitor had already focused the composer, this moved the subsequent Enter press back to the project button. The fix only restores trigger focus if focus is still in the closed dialog or on the document body; it applies the same guard to delayed host layout acknowledgements. A browser regression explicitly delivers the late close event after typing and asserts that composer focus and subsequent sending survive.

No other candidate stage failed. The final run was restarted after the fix rather than counting this run as a pass.

The delayed-close sequence was also reproduced separately in installed Chrome against the unchanged local production build: composer focus became false and the project resume button became active. See `focus-race-before.json`.
