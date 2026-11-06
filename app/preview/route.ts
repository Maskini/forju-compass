// A host page for visitor trials. It loads the same public script a CMS embeds.
export function GET(request: Request) {
  const english = new URL(request.url).searchParams.get("lang") === "en";
  const lang = english ? "en" : "de";
  const preview = english ? "Website preview" : "Website-Vorschau";
  const title = english ? "Try ForJu Compass" : "Probiere ForJu Compass aus";
  const instruction = english
    ? "Open the chat at the bottom right. Ask your question as you would ask someone at ForJu."
    : "Öffne den Chat unten rechts. Stell deine Frage so, wie du sie jemandem bei ForJu stellen würdest.";
  return new Response(`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${preview} · ForJu Compass</title>
<link rel="stylesheet" href="/compass-preview.css">
</head>
<body>
<header><img src="/forju/forju-compass-logo.png" alt="ForJu Compass"><nav aria-label="${english ? "Language" : "Sprache"}"><a href="/preview?lang=de" lang="de" hreflang="de"${english ? "" : ' aria-current="page"'}>DE</a><a href="/preview?lang=en" lang="en" hreflang="en"${english ? ' aria-current="page"' : ""}>EN</a></nav></header>
<main><p class="preview-label">${preview}</p><h1>${title}</h1><p>${instruction}</p>
</main>
<script defer src="/compass-widget.js" data-welcome="closed"></script>
</body></html>`, {headers: {"Content-Type":"text/html; charset=utf-8","X-Robots-Tag":"noindex, nofollow"}});
}
