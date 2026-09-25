"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppLanguage, setAppLanguage } from "@/lib/language";
import FloatingOrigami from "@/app/components/FloatingOrigami";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, safeSourceUrl, type ChatMessage } from "@/lib/chat";

const EN: Record<string, string> = {
"Die Anfrage konnte nicht verarbeitet werden.":"The request could not be processed.","Die Antwort war leer. Bitte versuche es erneut.":"The answer was empty. Please try again.","Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.":"The request took too long. Please try again.","ForJu Compass ist gerade nicht erreichbar. Bitte versuche es erneut.":"ForJu Compass is currently unavailable. Please try again.","Die Antwort konnte nicht vollständig erzeugt werden. Bitte versuche es erneut.":"The answer could not be completed. Please try again.",
  "Finde deinen nächsten Schritt": "Find your next step",
  "Wissen. Möglichkeiten. Menschen. Für deine Ideen von morgen.": "Knowledge. Opportunities. People. For your ideas of tomorrow.",
  "Fragen.": "Ask.",
  "Entdecken.": "Discover.",
  "Loslegen.": "Get started.",
  "Mit KI suchen": "Search with AI",
  "Wobei können wir dich unterstützen?": "How can we help you?",
  "Frage an ForJu Compass": "Question for ForJu Compass",
  "Frage senden": "Send question",
  "Beispielfragen": "Suggested questions",
  "Hauptnavigation": "Main navigation",
  "ForJu Startseite": "ForJu homepage",
  "Sprache": "Language",
  "Menü": "Menu",
  "Service": "Services",
  "Projekte": "Projects",
  "Über uns": "About us",
  "Jobs": "Jobs",
  "Partner": "Partners",
  "Kontakt": "Contact",
  "Jetzt spenden": "Donate now",
  "Förderung für mein Projekt": "Funding for my project",
  "Wie vernetze ich mich?": "How can I connect with others?",
  "Workshop für meine Schule": "Workshop for my school",
  "Tipps für die Projektumsetzung": "Tips for developing my project",
  "Was macht ForJu?": "What does ForJu do?",
  "Das könnte für dich interessant sein": "This might interest you",
  "Unsere Antwort auf deine Frage": "Our answer to your question",
  "Gesprächsverlauf": "Conversation",
  "Du": "You",
  "Gefundene Quellen": "Sources found",
  "ForJu Compass sucht eine Antwort auf": "ForJu Compass is looking for an answer to",
  "Erneut versuchen": "Try again",
  "Mehr erfahren": "Learn more",
  "Neues Gespräch": "New conversation",
  "Relevante ForJu Seiten": "Relevant ForJu pages",
  "Quellen werden gesucht …": "Looking for sources …",
  "Öffentliche Quelle": "Public source",
  "Beratung & Unterstützung": "Advice & support",
  "Begleitung für deine Ideen und Fragen": "Guidance for your ideas and questions",
  "ForJu kennenlernen": "Get to know ForJu",
  "Menschen, Wissen und Möglichkeiten verbinden": "Connecting people, knowledge and opportunities",
  "Fördermöglichkeiten": "Funding opportunities",
  "Zugang zu Partnern und Förderungen": "Access to partners and funding",
  "Passende Projekte & Services": "Relevant projects & services",
  "Deine Projektidee weiterdenken": "Develop your project idea",
  "Orientierung und Unterstützung für deinen nächsten Schritt.": "Guidance and support for your next step.",
  "Netzwerk": "Network",
  "Wissen teilen. Zukunft gestalten.": "Share knowledge. Shape the future.",
  "Gemeinsam forschen, lernen und neue Kontakte knüpfen.": "Research, learn and make new connections together.",
  "Mehr entdecken": "Discover more",
  "IDEEN VERBINDEN. ZUKUNFT GESTALTEN.": "CONNECT IDEAS. SHAPE THE FUTURE.",
  "Du hast eine Idee und möchtest weiterkommen? ForJu verbindet junge Menschen mit Wissen, Mentor:innen und Möglichkeiten. Frag Compass, welche Unterstützung zu deinem Vorhaben passt.": "Have an idea and want to move forward? ForJu connects young people with knowledge, mentors and opportunities. Ask Compass what support fits your project."
};

type Source = {
  title: string;
  url: string;
};

const QUICK_QUESTIONS = [
  {
    label: "Förderung für mein Projekt",
    tone: "pink",
    icon: <GraduationIcon />,
  },
  {
    label: "Wie vernetze ich mich?",
    tone: "blue",
    icon: <PeopleIcon />,
  },
  {
    label: "Workshop für meine Schule",
    tone: "orange",
    icon: <BulbIcon />,
  },
  {
    label: "Tipps für die Projektumsetzung",
    tone: "green",
    icon: <DocumentIcon />,
  },
  {
    label: "Was macht ForJu?",
    tone: "pink",
    icon: <SparkleIcon />,
  },
] as const;

export default function Home() {
  const language = useAppLanguage();
  const t = (text: string) => language === "en" ? (EN[text] ?? text) : text;
  const official = (path = "") => `https://forju.at/${language}${path}`;
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const switchLanguage = setAppLanguage;
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const [turns, setTurns] = useState<{ question: string; answer: string; sources: Source[] }[]>([]);
  const inFlight = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const latestSources = !loading && !error ? (turns.at(-1)?.sources ?? []) : [];

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [turns, loading, error]);

  async function submit(value?: string) {
    const next = (value ?? question).trim();

    if (!next || inFlight.current || next.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    inFlight.current = true;
    setSubmittedQuestion(next);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          message: next,
          history: turns.slice(-MAX_HISTORY_MESSAGES / 2).flatMap((turn): ChatMessage[] => [
            { role: "user", content: turn.question },
            { role: "assistant", content: turn.answer.slice(0, 4000) },
          ]),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Die Anfrage konnte nicht verarbeitet werden."
        );
      }

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("Die Antwort war leer. Bitte versuche es erneut.");
      }
      const sources: Source[] = Array.isArray(data.sources) ? data.sources.filter(
        (source: Source) => source && typeof source.title === "string" && safeSourceUrl(source.url)
      ) : [];
      setTurns((previous) => [...previous, { question: next, answer: data.answer, sources }]);
      setSubmittedQuestion("");
    } catch (err) {
      console.error(err);

      setQuestion(next);
      setError(err instanceof Error && err.name === "TimeoutError"
        ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
        : err instanceof Error ? err.message : "Die Anfrage konnte nicht verarbeitet werden.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="compass-page">
      <FloatingOrigami />
      <section className="scene">
        <div
          className="scene__wash"
          aria-hidden="true"
        />

        <header className="site-header">
          <nav
            className="nav-card"
            aria-label={t("Hauptnavigation")}
          >
            <a
              href={official()} target="_blank" rel="noopener noreferrer"
              className="nav-brand"
              aria-label={t("ForJu Startseite")}
            >
              <span className="wordmark-rainbow" aria-hidden="true">ForJu</span>
              <span className="wordmark-pink" aria-hidden="true">ForJu</span>
            </a>

            <div className="nav-links">
              <div className="nav-service">
                <a href={official("/services")} target="_blank" rel="noopener noreferrer">{t("Service")}</a>
                <details onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
                  <summary aria-label={language === "en" ? "Service submenu" : "Service-Untermenü"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
                  <div className="nav-service-panel">
                    {[["Know-How", "Know-how", "/services/know-how"], ["Finanzielle Unterstützung", "Financial support", "/services/finanziell"], ["Ressourcen", "Resources", "/services/ressourcen"], ["Connections", "Connections", "/services/connections"]].map(([de,en,path]) => <a key={path} href={official(path)} target="_blank" rel="noopener noreferrer">{language === "en" ? en : de}</a>)}
                  </div>
                </details>
              </div>
              {[["Projekte", "/projects"], ["Über uns", "/ueber-uns"], ["Jobs", "/jobs"], ["Partner", "/partner"], ["Kontakt", "/kontakt"]].map(([label, path]) => <a key={path} href={official(path)} target="_blank" rel="noopener noreferrer">{t(label)}</a>)}
            </div>
            <details className="mobile-navigation" onKeyDown={event => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}>
              <summary aria-label={t("Menü")}><svg className="menu-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><svg className="menu-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></summary>
              <div className="mobile-menu-panel">
                <a className="mobile-menu-primary" href={official("/services")} target="_blank" rel="noopener noreferrer"><DocumentIcon />{t("Service")}</a>
                <div className="mobile-service-links">
                  {[["Know-How", "Know-how", "/services/know-how"], ["Finanzielle Unterstützung", "Financial support", "/services/finanziell"], ["Ressourcen", "Resources", "/services/ressourcen"], ["Connections", "Connections", "/services/connections"]].map(([de,en,path]) => <a key={path} href={official(path)} target="_blank" rel="noopener noreferrer">{language === "en" ? en : de}</a>)}
                </div>
                {[["Projekte", "/projects"], ["Über uns", "/ueber-uns"], ["Jobs", "/jobs"], ["Partner", "/partner"], ["Kontakt", "/kontakt"]].map(([label, path], index) => <a className="mobile-menu-primary" key={path} href={official(path)} target="_blank" rel="noopener noreferrer"><MenuIcon index={index} />{t(label)}</a>)}
                <a className="mobile-menu-donate" href={official("/spenden")} target="_blank" rel="noopener noreferrer">{t("Jetzt spenden")}</a>
              </div>
            </details>

            <div className="nav-actions">
              <a
                className="donate-button"
                href={official("/spenden")} target="_blank" rel="noopener noreferrer"
              >
                {t("Jetzt spenden")}
              </a>

              <div
                className="language-switch"
                aria-label={t("Sprache")}
              >
                <button
                  className={language === "de" ? "language-switch__active" : ""}
                  aria-pressed={language === "de"} onClick={() => switchLanguage("de")}
                  type="button"
                >
                  DE
                </button>

                <button type="button" className={language === "en" ? "language-switch__active" : ""} aria-pressed={language === "en"} onClick={() => switchLanguage("en")}>
                  EN
                </button>
              </div>
            </div>
          </nav>
        </header>

        <div className="hero">
          <img
            className="hero__logo"
            src="/forju/forju-compass-logo.png"
            alt="ForJu Compass"
          />

          <div className="hero__heading-wrap">
            <h1>
              {t("Finde deinen nächsten Schritt")}
            </h1>

            <span
              className="hero__underline"
              aria-hidden="true"
            />

            <span
              className="hero__plane"
              aria-hidden="true"
            >
              <img src="/forju/origami/pink-airplane.png" alt="" draggable={false} />
            </span>
          </div>

          <p className="hero__subtitle">
            {t("Wissen. Möglichkeiten. Menschen. Für deine Ideen von morgen.")}
          </p>

          <div
            className="hero-note"
            aria-hidden="true"
          >
            <span>{t("Fragen.")}</span>
            <span>{t("Entdecken.")}</span>
            <span>{t("Loslegen.")}</span>
            <i />
          </div>

          <form
            className="search"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <span className="search__icon">
              <SearchIcon />
            </span>

            <input
              maxLength={MAX_MESSAGE_LENGTH}
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder={t("Wobei können wir dich unterstützen?")}
              aria-label={t("Frage an ForJu Compass")}
              disabled={loading}
            />

            <span className="search__ai">
              <SparkleIcon />
              {t("Mit KI suchen")}
            </span>

            <button
              className="search__send"
              type="submit"
              aria-label={t("Frage senden")}
              disabled={loading || !question.trim()}
              aria-busy={loading}
            >
              <ArrowIcon />
            </button>
          </form>

          <div
            className="quick-actions"
            aria-label={t("Beispielfragen")}
          >
            {QUICK_QUESTIONS.map((item) => (
              <button
                type="button"
                key={t(item.label)}
                className={`quick-action quick-action--${item.tone}`}
                onClick={() =>
                  submit(t(item.label))
                }
                disabled={loading}
              >
                <span>
                  {item.icon}
                </span>

                {t(item.label)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="results-section">
        <div className="results">
          <h2>
            {t("Das könnte für dich interessant sein")}
          </h2>

          <div className="results-grid">
            <article className="result-card result-card--answer">
              <CardTitle
                icon={<BulbIcon />}
                tone="pink"
              >
                {t("Unsere Antwort auf deine Frage")}
              </CardTitle>

              <div ref={transcript} className="answer-copy" role="region" aria-label={t("Gesprächsverlauf")} tabIndex={0} aria-live="polite" aria-busy={loading}>
                {turns.length === 0 && !submittedQuestion && (
                  <p>{t("Du hast eine Idee und möchtest weiterkommen? ForJu verbindet junge Menschen mit Wissen, Mentor:innen und Möglichkeiten. Frag Compass, welche Unterstützung zu deinem Vorhaben passt.")}</p>
                )}
                {turns.map((turn, index) => (
                  <div className="chat-turn" key={index}>
                    <p className="answer-copy__question">{t("Du")}: {turn.question}</p>
                    <p className="chat-answer">{turn.answer}</p>
                    {turn.sources.length > 0 && (
                      <div className="chat-sources">
                        <strong>{t("Gefundene Quellen")}</strong>
                        {turn.sources.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && <p>{t("ForJu Compass sucht eine Antwort auf")} „{submittedQuestion}“ …</p>}
                {error && <div role="alert"><p className="chat-error">{t(error)}</p>
                  <button type="button" className="retry-button" onClick={() => submit(submittedQuestion)} disabled={loading}>{t("Erneut versuchen")}</button>
                </div>}
              </div>
              {turns.length === 0 && !loading && !error && <a className="answer-cta" href={official("/services")} target="_blank" rel="noopener noreferrer">{t("Mehr erfahren")} <ChevronIcon /></a>}
              {(turns.length > 0 || error) && (
                <button type="button" className="answer-cta" disabled={loading} onClick={() => {
                  setTurns([]); setQuestion(""); setSubmittedQuestion(""); setError("");
                }}>{t("Neues Gespräch")}</button>
              )}

              <div
                className="boat-path"
                aria-hidden="true"
              />

              <img
                className="paper-boat"
                src="/forju/paper-boat.png"
                alt=""
              />
            </article>

            <article className="result-card result-card--pages">
              <CardTitle
                icon={<DocumentIcon />}
                tone="green"
              >
                {t("Relevante ForJu Seiten")}
              </CardTitle>

              <div className="resource-list">
                {latestSources.length > 0 ? latestSources.map((source) => (
                  <a className="resource-row" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                    <span><strong>{source.title}</strong><small>{source.url.startsWith("/wissen/") ? t("Öffentliche Quelle") : new URL(source.url).hostname}</small></span>
                    <ChevronIcon />
                  </a>
                )) : loading ? <p>{t("Quellen werden gesucht …")}</p> : [
                  { url: official("/services"), title: "Beratung & Unterstützung", detail: "Begleitung für deine Ideen und Fragen" },
                  { url: official("/ueber-uns"), title: "ForJu kennenlernen", detail: "Menschen, Wissen und Möglichkeiten verbinden" },
                  { url: official("/services/finanziell"), title: "Fördermöglichkeiten", detail: "Zugang zu Partnern und Förderungen" },
                ].map((source) => <a className="resource-row" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><span><strong>{t(source.title)}</strong><small>{t(source.detail)}</small></span><ChevronIcon /></a>)}
              </div>
            </article>

            <article className="result-card result-card--services">
              <CardTitle
                icon={<StarIcon />}
                tone="orange"
              >
                {t("Passende Projekte & Services")}
              </CardTitle>
              <div className="service-list">
                <a className="service-row" href={official("/services")} target="_blank" rel="noopener noreferrer">
                  <img src="/forju/project-financing.webp" alt="" />
                  <span className="service-row__copy"><span className="service-tag service-tag--pink">{t("Service")}</span><strong>{t("Deine Projektidee weiterdenken")}</strong><span>{t("Orientierung und Unterstützung für deinen nächsten Schritt.")}</span></span><ChevronIcon />
                </a>
                <a className="service-row" href={official("/services/connections")} target="_blank" rel="noopener noreferrer">
                  <img src="/forju/project-knowledge.webp" alt="" />
                  <span className="service-row__copy"><span className="service-tag service-tag--green">{t("Netzwerk")}</span><strong>{t("Wissen teilen. Zukunft gestalten.")}</strong><span>{t("Gemeinsam forschen, lernen und neue Kontakte knüpfen.")}</span></span><ChevronIcon />
                </a>
              </div>
              <a className="card-link card-link--pink" href={official("/projects")} target="_blank" rel="noopener noreferrer">{t("Mehr entdecken")} <ChevronIcon /></a>
            </article>
          </div>
        </div>
      </section>

      <section className="contact-section" aria-labelledby="contact-heading">
        <div className="paper-footer__edge" aria-hidden="true" />
        <span className="contact-eyebrow">HEY</span>
        <h2 id="contact-heading"><span>{t("Kontakt")}</span></h2>
        <p>{language === "en" ? "A question, project idea, or just hello? Write to us — we'll get back to you." : "Frage, Projektidee oder einfach Hallo? Schreib uns – wir melden uns."}</p>
        <a className="footer-pill footer-pill--pink" href={official("/kontakt")} target="_blank" rel="noopener noreferrer">{language === "en" ? "Get in touch" : "Kontakt aufnehmen"}</a>
        <div className="contact-actions">
          {[
            ["Projekt einreichen", "Submit a project", "/kontakt?intent=projekt"],
            ["Service anfragen", "Request a service", "/kontakt?intent=service"],
            ["Mitglied werden", "Become a member", "/kontakt?intent=mitglied"],
            ["Partner werden", "Become a partner", "/kontakt?intent=partner"],
            ["Spenden", "Donate", "/spenden"],
          ].map(([de,en,path]) => <a key={path} className="footer-pill" href={official(path)} target="_blank" rel="noopener noreferrer">{language === "en" ? en : de}</a>)}
        </div>
      </section>
      <footer className="official-footer">
        <div className="footer-columns">
          <div className="footer-about">
            <a className="footer-wordmark" aria-label="ForJu" href={official()} target="_blank" rel="noopener noreferrer"><span className="wordmark-rainbow" aria-hidden="true">ForJu</span><span className="wordmark-pink" aria-hidden="true">ForJu</span></a>
            <p>{language === "en" ? "Association of Young Researchers — we connect young people, companies, universities, institutes, and schools." : "Verein der Forschenden Jugend — wir verbinden Jugendliche, Unternehmen, Hochschulen, Institute und Schulen."}</p>
            <p className="footer-credit">{language === "en" ? "Developed with" : "Entwickelt mit"}{" "}<span className="credit-heart nav-brand" role="img" aria-label={language === "en" ? "love" : "Liebe"} style={{ display: "inline-grid", width: "22px", height: "22px", verticalAlign: "middle", textShadow: "none" }}>
              <svg viewBox="0 0 36 36" aria-hidden="true" style={{ width: "22px", height: "22px", overflow: "visible" }}>
                <defs>
                  <linearGradient id="credit-heart-colors" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#ff3aae"/><stop offset=".5" stopColor="#fe6127"/><stop offset="1" stopColor="#2fbf6b"/></linearGradient>
                  <mask id="credit-heart-shape" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36" style={{ maskType: "alpha" }}>
                    <text x="18" y="28" textAnchor="middle" fontSize="30" fontFamily="Apple Color Emoji, Segoe UI Emoji, sans-serif">❤️</text>
                  </mask>
                </defs>
                <g className="wordmark-rainbow" style={{ background: "none", transition: "opacity 150ms" }}>
                  <rect width="36" height="36" fill="#2d1e1e" opacity=".28" mask="url(#credit-heart-shape)" transform="translate(0 -1)"/>
                  <g mask="url(#credit-heart-shape)">
                    <rect width="36" height="36" fill="url(#credit-heart-colors)"/>
                    <rect width="36" height="36" fill="white" opacity=".65" mask="url(#credit-heart-shape)" transform="translate(0 1)"/>
                  </g>
                </g>
                <g className="wordmark-pink" style={{ transition: "opacity 150ms" }}><rect width="36" height="36" fill="#ff3aae" mask="url(#credit-heart-shape)"/></g>
                <text x="18" y="28" textAnchor="middle" fontSize="30" fontFamily="Apple Color Emoji, Segoe UI Emoji, sans-serif" style={{ filter: "grayscale(1)", mixBlendMode: "soft-light", opacity: .18 }}>❤️</text>
              </svg>
            </span>{" "}{language === "en" ? "by" : "von"} <a href="https://www.linkedin.com/in/adam-maskini/" target="_blank" rel="noopener noreferrer" className="creator-credit-link">Adam Maskini</a></p>
          </div>
          <div className="footer-link-columns"><nav aria-label={language === "en" ? "Footer navigation" : "Footernavigation"}>
            <h3>NAVIGATION</h3>
            {[["Service", "/services"], ["Projekte", "/projects"], ["Über uns", "/ueber-uns"], ["Jobs", "/jobs"], ["Partner", "/partner"], ["Kontakt", "/kontakt"], ["Spenden", "/spenden"]].map(([label,path]) => <a key={path} href={official(path)} target="_blank" rel="noopener noreferrer">{label === "Spenden" && language === "en" ? "Donate" : t(label)}</a>)}
          </nav>
          <div><h3>SOCIAL</h3>
            <a href="https://www.instagram.com/forju.at" target="_blank" rel="noopener noreferrer">Instagram <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
            <a href="https://www.linkedin.com/company/verein-der-forschenden-jugend/" target="_blank" rel="noopener noreferrer">LinkedIn <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
            <a href="https://www.facebook.com/people/ForJu-Verein-der-Forschenden-Jugend/61556404965389/" target="_blank" rel="noopener noreferrer">Facebook <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
          </div>
          <div><h3>{language === "en" ? "CONTACT" : "KONTAKT"}</h3><a href="mailto:office@forju.at"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>office@forju.at</a></div></div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 {language === "en" ? "Association of Young Researchers. All rights reserved." : "Verein der Forschenden Jugend. Alle Rechte vorbehalten."}</p>
          <nav aria-label={language === "en" ? "Legal information" : "Rechtliche Informationen"}>
            {[["Impressum", "Imprint", "/impressum"], ["Datenschutz", "Privacy Policy", "/datenschutz"], ["Barrierefreiheit", "Accessibility", "/barrierefreiheit"], ["Jugendschutz", "Youth protection", "/ueber-uns#jugendschutz"], ["Presse", "Press", "/kontakt?intent=presse"]].map(([de,en,path]) => <a key={path} href={official(path)} target="_blank" rel="noopener noreferrer">{language === "en" ? en : de}</a>)}
          </nav>
        </div>
      </footer>
    </main>
  );
}

function CardTitle({
  icon,
  tone,
  children,
}: {
  icon: ReactNode;
  tone:
    | "pink"
    | "green"
    | "orange";
  children: ReactNode;
}) {
  return (
    <div className="card-title">
      <span
        className={`card-title__icon card-title__icon--${tone}`}
      >
        {icon}
      </span>

      <h3>
        {children}
      </h3>
    </div>
  );
}

/* ---------- ICONS ---------- */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle
        cx="11"
        cy="11"
        r="6"
      />

      <path d="m16 16 4 4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 2c.8 5.1 2.9 7.2 8 8-5.1.8-7.2 2.9-8 8-.8-5.1-2.9-7.2-8-8 5.1-.8 7.2-2.9 8-8Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 18h6M10 22h4" />

      <path d="M8.5 15.5A7 7 0 1 1 15.5 15.5c-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />

      <path d="M7 12v4c3 2 7 2 10 0v-4" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
      />

      <circle
        cx="17"
        cy="9"
        r="2.5"
      />

      <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6" />

      <path d="M15 15c3 0 5 1.7 5 5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}
function MenuIcon({ index }: { index: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {index === 0 ? <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> :
      index === 1 ? <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 3 5"/></> :
      index === 2 ? <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16"/></> :
      index === 3 ? <path d="m3 5 5 1 4-2 4 2 5-1v12l-4 3-5-5-3 3-6-5V5Zm5 1-3 5 3 2 4-4 6 6M16 6l-4 3"/> :
      <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>}
  </svg>;
}
