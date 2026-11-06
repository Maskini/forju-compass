# Install ForJu Compass

Deploy the Compass release on the existing Node service first. Verify that
`https://forju-compass.onrender.com/compass-widget.js` returns JavaScript
with HTTP 200. A working homepage alone does not verify the widget.

Paste this once in the host’s site-wide footer HTML immediately before
`</body>`, on both language versions. In a CMS use its footer code injection
setting. In a Next.js layout use its existing script-loading convention and
load this URL after the body is available.

```html
<script defer src="https://forju-compass.onrender.com/compass-widget.js"></script>
```

The launcher follows the host document’s `lang`. On desktop it opens a side
panel, on mobile a full-screen dialog. The conversation lasts until the host
document reloads. The same panel is also available on its own at
`/embed?lang=en` or `/embed?lang=de`; all surfaces use `/api/chat`.

If the host enforces CSP, permit the Compass origin in `script-src`,
`style-src`, `img-src`, and `frame-src` (or their more specific element
directives if set). Chat requests stay inside the Compass frame. The parent
gets no question text or answers. If the script itself is blocked or returns
404 there is no launcher. If the frame fails after opening, visitors can
retry or open ForJu’s public contact page.

## On the Compass host

1. Deploy the Next.js **Node** app at its own HTTPS origin. Static HTML hosting
   alone does not run the backend. No API keys belong on the parent website.
2. Before building Compass, set `COMPASS_EMBED_ORIGINS` to a comma-separated
   list of exact approved HTTPS parent origins (for example,
   `https://forju.at,https://www.forju.at`). Rebuild after changing this list.
   If unset, the two official ForJu origins above and same-origin frames are allowed. An explicit empty value permits same-origin only. Only /embed gets the extra
   frame permissions. If the host adds X-Frame-Options: DENY/SAMEORIGIN or a
   stricter CSP, configure it to permit the intended /embed use.
3. Set `COMPASS_LOCAL_ONLY=true` on the running service to use the reviewed
   public DE/EN catalog. This bypasses OpenAI and Supabase for visitor chat
   and search even when credentials are present. No provider key is required.
   Feedback email, if enabled, uses the existing server-side Resend settings.
4. For a single Node host use a persistent local volume for COMPASS_QUOTA_DB,
   e.g. /data/compass/quota.sqlite. Node 24 is required. Local default:
   work/ai-quota.sqlite. Restarting preserves limits if the filesystem persists;
   ephemeral redeploys do not. Multiple independent hosts need a shared counter
   before scaling. Only set COMPASS_CLIENT_IP_HEADER if your reverse proxy
   **overwrites** it with one validated IP and blocks direct access. Without
   it only the shared quota applies. No raw IP addresses are stored in quotas.
   Limits: 5 requests/min and 40/day per identified visitor, 12/min and 300/day
   globally across chat and search. These count requests, not currency.
5. Confirm the host site's privacy information covers Compass and its providers
   before enabling it. Its existing forju.at privacy notice is not automatically
   the privacy notice for this separate application.


## Verify installation

From an allowed parent, open Compass, ask about a TikTok school workshop,
then ask “Und wie melde ich mich dafür an?”. Open the workshop link and
return to the chat. Close with Escape, reopen and check both turns remain.
Repeat on a phone with its keyboard open and rotate the phone. Confirm an
unlisted origin is denied framing. The standalone page should still open.

## Project inquiries

“Projektentwurf starten” / “Start a project draft” uses the visitor’s words
from this chat. Guided answers and edits live in component memory. Reloading
the page clears them. Both languages link to the corresponding official
`/kontakt?intent=projekt` form. The visitor transfers the editable message,
enters their name and email there, and decides whether to submit. Compass
never sends the draft to a submission endpoint. If a host disables clipboard
writing, visitors can select and copy the message manually.

The draft follows six optional steps: idea and goals, audience, implementation, resources, impact, and review. Closing the draft returns to the conversation; reopening resumes the same step. No account or browser storage is used for project details. Only a layout toggle (no draft content) is sent to the host widget to expand its desktop dialog.
