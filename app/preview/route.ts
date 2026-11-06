// A host page for visitor trials. It loads the same public script a CMS embeds.
export function GET(request: Request) {
  const english = new URL(request.url).searchParams.get("lang") === "en";
  const lang = english ? "en" : "de";
  const preview = english ? "Website preview" : "Website-Vorschau";
  const title = english ? "Try ForJu Compass" : "Probiere ForJu Compass aus";
  const instruction = english
    ? "Open the chat at the bottom right. Ask your question as you would ask someone at ForJu."
    : "Öffne den Chat unten rechts. Stell deine Frage so, wie du sie jemandem bei ForJu stellen würdest.";
  const services = [
    ["know-how", "Know-how für dein Projekt", "Project expertise"],
    ["finanziell", "Finanzielle Unterstützung", "Project funding"],
    ["ressourcen", "Räume und Geräte", "Rooms and equipment"],
    ["connections", "Kontakte knüpfen", "Making connections"],
  ];
  return new Response(`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${preview} · ForJu Compass</title>
<link rel="stylesheet" href="/compass-preview.css">
</head>
<body>
<div class="preview-scene">
<header><img src="/forju/forju-compass-logo.png" alt="ForJu Compass"><nav aria-label="${english ? "Language" : "Sprache"}"><a href="/preview?lang=de" lang="de" hreflang="de"${english ? "" : ' aria-current="page"'}>DE</a><a href="/preview?lang=en" lang="en" hreflang="en"${english ? ' aria-current="page"' : ""}>EN</a></nav></header>
<main><p class="preview-label">${preview}</p><h1>${title}</h1><p>${instruction}</p>
</main></div>
<section class="preview-services" aria-labelledby="services-title"><h2 id="services-title">${english ? "Explore ForJu’s services" : "ForJus Angebote entdecken"}</h2>
<ul>${services.map(([path, de, en]) => `<li><a href="https://forju.at/${lang}/services/${path}">${english ? en : de}<span aria-hidden="true">↗</span></a></li>`).join("")}</ul>
</section>
<script defer src="/compass-widget.js" data-welcome="closed"></script>
</body></html>`, {headers: {"Content-Type":"text/html; charset=utf-8","X-Robots-Tag":"noindex, nofollow"}});
}
