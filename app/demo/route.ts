// Shareable, self-hosted recordings. The widget is the same CMS installation.
export function GET() {
  return new Response(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>ForJu Compass ausprobieren · Website-Vorschau</title>
<link rel="stylesheet" href="/compass-preview.css">
</head>
<body class="demo-page">
<header><img src="/forju/forju-compass-logo.png" alt="ForJu Compass"><a href="/preview?lang=de">Zur Website-Vorschau →</a></header>
<main class="demo-main">
<p class="preview-label">Website-Vorschau</p>
<h1>Von der Frage zum nächsten Schritt.</h1>
<p>So begleitet ForJu Compass Besucher:innen: mit passenden Angeboten, Antworten auf Rückfragen und einem direkten Weg zu ForJu.</p>
<figure class="demo-film">
<video id="workshop-video" controls playsinline preload="metadata" poster="/demos/forju-compass-demo-de.jpg?v=2" aria-label="ForJu Compass: Schulworkshops, Rückfrage und ForJu-Seite, 36 Sekunden, mit Musik">
<source src="/demos/forju-compass-demo-de.mp4?v=2" type="video/mp4">
<a href="/demos/forju-compass-demo-de.mp4">Video herunterladen</a>
</video>
<figcaption>Echte Antworten, kurze Wege. 36 Sekunden · mit Musik. Die Aufnahme zeigt eine Browser-Vorschau auf der ForJu-Website; die öffentliche Website wurde nicht verändert. <a href="/demos/forju-compass-demo-de.mp4?v=2" download="forju-compass-demo-de.mp4">MP4 herunterladen</a></figcaption>
</figure>
<nav class="demo-chapters" aria-label="Kapitel im Gesprächsvideo" data-video="workshop-video"><button type="button" data-seek="0" disabled>Frage stellen</button><button type="button" data-seek="4" disabled>Antwort entdecken</button><button type="button" data-seek="18" disabled>Nachfragen</button><button type="button" data-seek="28" disabled>ForJu-Seite öffnen</button></nav>
<details class="demo-details"><summary>Gespräch nachlesen</summary>
<p><strong>Besucher:in:</strong> Welche Workshops bietet ihr für Schulen an?</p>
<p><strong>Compass:</strong> Für deine Klasse in Wien kannst du Workshops zu Klima, Konflikten im Team, Medienkompetenz oder Rollenbildern anfragen. Weitere Themen sind Ethik, Stressbewältigung, Selbstmanagement und Zukunftsplanung. Junge Trainer:innen arbeiten dabei mit den Lehrkräften zusammen.</p>
<p>Schreib Anja Hofer (anja.hofer@forju.at), welches Thema euch interessiert. Frag sie nach einem Termin und den Kosten für eure Klasse. Im November 2024 waren die Seminare für die Schulstufen 1–9 über die Wiener Bildungschancen vollständig gefördert.</p>
<p><strong>Besucher:in:</strong> Und wie melde ich meine Klasse dafür an?</p>
<p><strong>Compass:</strong> Um einen Schulworkshop zu vereinbaren, schreib Anja Hofer an anja.hofer@forju.at und frag nach einem Termin für deine Klasse.</p>
<p><a href="https://forju.at/de/projects/schulworkshops">Schulworkshops auf forju.at ansehen ↗</a></p>
</details>
<section class="demo-project" aria-labelledby="project-demo-title"><h2 id="project-demo-title">Eine Projektidee vorstellen</h2>
<p>Angaben aus dem Chat übernehmen, ergänzen und nach einer Pause weiterbearbeiten – ohne Konto.</p>
<figure class="demo-film"><video id="project-video" controls playsinline preload="none" poster="/demos/forju-compass-projekt-de.jpg?v=2" aria-label="ForJu Compass: Projektangaben bearbeiten und fortsetzen, 40 Sekunden, mit Musik"><source src="/demos/forju-compass-projekt-de.mp4?v=2" type="video/mp4"><a href="/demos/forju-compass-projekt-de.mp4">Projektvideo herunterladen</a></video>
<figcaption>40 Sekunden · mit Musik. Die Aufnahme zeigt das Ausfüllen und Überprüfen. Im Video wurde nichts versendet. <a href="/demos/forju-compass-projekt-de.mp4?v=2" download="forju-compass-projekt-de.mp4">MP4 herunterladen</a></figcaption></figure>
<nav class="demo-chapters" aria-label="Kapitel im Projektvideo" data-video="project-video"><button type="button" data-seek="0" disabled>Idee erzählen</button><button type="button" data-seek="9" disabled>Angaben ergänzen</button><button type="button" data-seek="16" disabled>Später fortsetzen</button><button type="button" data-seek="30.5" disabled>Überprüfen</button></nav>
</section>
<section class="demo-try" aria-labelledby="try-title"><h2 id="try-title">Jetzt selbst ausprobieren</h2><p>Öffne ForJu Compass unten rechts und stell deine Frage. Zum Beispiel: „Welche Workshops bietet ihr für Schulen an?“</p><a href="/preview?lang=de">Website-Vorschau öffnen →</a></section>
</main>
<script defer src="/compass-widget.js" data-lang="de" data-welcome="closed"></script>
<script defer src="/compass-demo.js"></script>
</body></html>`, {headers: {"Content-Type":"text/html; charset=utf-8","X-Robots-Tag":"noindex, nofollow"}});
}
