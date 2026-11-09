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

The launcher follows the host document’s `lang`. It starts collapsed. Set
`data-welcome="open"` to display the welcome card on load. Desktop chat opens
as a compact floating panel, with controls to expand, restore or minimize it.
Visitors can scroll and click the host page alongside either desktop size.
On desktop, drag the compact chat by its logo/header to move it. The same
handle supports arrow keys (Shift for larger steps), Home to reset, and a click
menu with Left, Right and Reset position. The position is kept in this page's
memory when minimized or expanded, and stays within the viewport after resizing.
Leaving the page (including switching to another tab) closes the chat and resets
its position and size. On return, the launcher stays collapsed; reopening starts
beside it. A tab switch preserves the exchange, unsent text and project/report
fields in the existing iframe. The conversation and project entries can recover after a reload in the same tab for 30 minutes after their last edit; report fields still remain in memory only. Browser storage restrictions can prevent recovery.
Project forms keep their centered dialog layout; closing them restores the chat
position. Nothing about the position is stored or sent to the server.
Phones use a full-screen chat. Reopening the launcher resumes the exchange. The conversation can recover in the same tab after a host reload; the widget still starts closed in its default position. The same panel is also available on its own at
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

“Projekt vorstellen” / “Tell us about your project” uses the visitor’s words
from this chat. Guided answers and edits also use bounded, versioned sessionStorage for same-tab reload recovery. Records expire 30 minutes after their last edit, are purged on access and periodically while the page is active, and are removed by the trash action. Browser restrictions fall back to memory. On Review, visitors can expand the final text, select it and use the
device’s Copy command. Send requests delivery using the configured project sender.
If the sender is unavailable, Compass keeps the draft in the current tab.

The draft follows six optional steps: idea and goals, audience, implementation, resources, impact, and review. Closing the draft returns to the conversation; reopening resumes the same step. No account is needed. Project fields, optional reply address, step and delivery receipt/key stay in the tab’s temporary recovery record. Reloading never submits anything. Identical retries retain their idempotency key, and an accepted project remains marked as accepted until edited. Only a layout toggle (no draft content) is sent to the host widget to expand its desktop dialog.

## Review the design inside the ForJu website

For a browser-only installation, use Node 24 and Google Chrome. From this checkout run:

```sh
npm ci
npm ci --prefix tools/visitor-checks
npm run preview:forju
```

The command builds Compass, starts a temporary local-only server on loopback port 4262, and opens the public German school-workshop article in a fresh Chrome window. Only that window loads the local widget. Open **ForJu Compass** at the bottom right. Follow ForJu links within this window to view other pages. The preview prevents external writes and project or report deliveries. Close the window to stop the preview. For the phone layout run `npm run preview:forju -- --phone`.

For paired screenshots, run `npm run preview:forju -- before` against the baseline and `npm run preview:forju -- after` against the candidate; use this version of the two preview scripts with both builds. Alternatively point `COMPASS_DESIGN_ORIGIN` at a known local-only build and run `node tools/visitor-checks/design-preview.mjs after`. The screenshots and interaction checks go in `work/design-review/`. Phone checks keep the screen size constant and emulate a reduced viewport. Verify the operating system's keyboard on a physical phone before a public install.


### Session conversation preferences

Compass retains an explicitly supplied name and requested answer language in the
current chat component, alongside the current topic. These small values accompany
requests to the existing Compass server; they are not authentication or verified
identity. Chat history remains bounded to the last four exchanges per request.
The trash/clear action removes these values and the current surface’s recovery records. Up to 30 exchanges, unsent text and these preferences can recover from sessionStorage in the same tab for 30 minutes after the last change. They are not written to cookies, localStorage, the host page or a server conversation database. Separate browser sessions have separate storage. Browser “restore tabs” features can preserve sessionStorage, so expiry and explicit clearing remain important. The project and conversation records expire separately; reopening alone does not renew them.
In local-only mode there are no inference-provider calls. Hosting still receives
the normal HTTP requests; its infrastructure logging is separate from app memory.
