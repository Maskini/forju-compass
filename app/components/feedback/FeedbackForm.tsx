"use client";
import { useRef, useState } from "react";
import { feedbackFieldsSchema, feedbackPageUrl, feedbackTypes, type FeedbackReport } from "@/lib/feedback-validation";
import type { AppLanguage } from "@/lib/language";

const copy = {
  incorrect_answer: ["Falsche Antwort", "Incorrect answer", "Die Antwort ist nicht korrekt oder irreführend.", "The answer is incorrect or misleading."],
  technical_problem: ["Technisches Problem", "Technical problem", "Etwas funktioniert nicht wie erwartet.", "Something is not working as expected."],
  outdated_information: ["Veraltete Information", "Outdated information", "Die Inhalte sind nicht mehr aktuell.", "The information is no longer current."],
  other: ["Sonstiges", "Other", "Ein anderes Problem oder Feedback.", "Another problem or general feedback."],
};
export default function FeedbackForm({ language }: { language: AppLanguage }) {
  const t = (de: string, en: string) => language === "en" ? en : de;
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "success">("idle");
  const inFlight = useRef(false);
  const retry = useRef<{ fingerprint: string; key: string; payload: FeedbackReport } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status === "success") return;
    const parsed = feedbackFieldsSchema.safeParse({ type, description, email: email.trim() });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        next[field] = field === "type" ? t("Bitte wähle eine Art des Problems.", "Please select a problem type.")
          : field === "email" ? t("Bitte gib eine gültige E-Mail-Adresse ein.", "Please enter a valid email address.")
          : t("Bitte verwende 10 bis 1000 Zeichen.", "Please use between 10 and 1000 characters.");
      }
      setErrors(next);
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    setErrors({}); inFlight.current = true; setStatus("sending");
    try {
      const honeypot = String(new FormData(event.currentTarget).get("website") || "");
      const fingerprint = JSON.stringify({ ...parsed.data, honeypot, language });
      if (retry.current?.fingerprint !== fingerprint) {
        retry.current = { fingerprint, key: crypto.randomUUID(), payload: {
          ...parsed.data, honeypot, timestamp: new Date().toISOString(),
          pageUrl: feedbackPageUrl(window.location.href), pathname: window.location.pathname.slice(0, 1024),
          pageTitle: document.title.slice(0, 200), language,
          userAgent: navigator.userAgent.slice(0, 512),
          viewportWidth: Math.min(20000, window.innerWidth), viewportHeight: Math.min(20000, window.innerHeight),
        } };
      }
      const attempt = retry.current;
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.key },
        body: JSON.stringify(attempt.payload), signal: AbortSignal.timeout(22000) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error("feedback_failed");
      setType(""); setDescription(""); setEmail(""); retry.current = null; setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch { setStatus("error"); }
    finally { inFlight.current = false; }
  }
  if (status === "success") return <div className="feedback-success" ref={successRef} tabIndex={-1} role="status" aria-live="polite">
    <span className="feedback-success-icon" aria-hidden="true">✓</span>
    <h3>{t("Danke für dein Feedback!", "Thank you for your feedback!")}</h3>
    <p>{t("Deine Rückmeldung wurde erfolgreich übermittelt.", "Your feedback was submitted successfully.")}</p>
    <button type="button" className="feedback-submit" onClick={() => { setErrors({}); setStatus("idle"); requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[name="type"]')?.focus()); }}>{t("Weiteres Feedback senden", "Send more feedback")}</button>
  </div>;
  return <form ref={formRef} className="feedback-form" onSubmit={submit} noValidate aria-busy={status === "sending"}>
    <fieldset disabled={status === "sending"} aria-describedby={errors.type ? "feedback-type-error" : undefined}>
      <legend>{t("Art des Problems", "Problem type")}</legend>
      <div className="feedback-types">{feedbackTypes.map(value => <label key={value} className="feedback-type">
        <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} required aria-describedby={errors.type ? "feedback-type-error" : undefined} />
        <span><strong>{copy[value][language === "en" ? 1 : 0]}</strong><small>{copy[value][language === "en" ? 3 : 2]}</small></span>
      </label>)}</div>
      {errors.type && <p id="feedback-type-error" className="feedback-field-error">{errors.type}</p>}
    </fieldset>
    <div>
      <label htmlFor="feedback-description">{t("Beschreibung", "Description")}</label>
      <textarea id="feedback-description" name="description" value={description} onChange={event => setDescription(event.target.value)} minLength={10} maxLength={1000} required disabled={status === "sending"}
        placeholder={t("Bitte beschreibe das Problem so genau wie möglich …", "Please describe the problem as clearly as possible …")}
        aria-invalid={Boolean(errors.description)} aria-describedby={`feedback-count${errors.description ? " feedback-description-error" : ""}`} />
      <p id="feedback-count" className="feedback-counter">{description.length} / 1000</p>
      {errors.description && <p id="feedback-description-error" className="feedback-field-error">{errors.description}</p>}
    </div>
    <div>
      <label htmlFor="feedback-email">{t("E-Mail für Rückmeldung (optional)", "Email for a reply (optional)")}</label>
      <div className="feedback-email-control"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><input id="feedback-email" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={status === "sending"}
        placeholder="deine@email.de" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "feedback-email-error" : undefined} /></div>
      {errors.email && <p id="feedback-email-error" className="feedback-field-error">{errors.email}</p>}
    </div>
    <div className="feedback-honeypot" aria-hidden="true"><label htmlFor="feedback-website">Website</label><input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></div>
    <div className="feedback-privacy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg><div><p>{t("Die aktuelle Seite und der Zeitpunkt werden automatisch mitgesendet, damit wir dein Feedback besser zuordnen können.", "The current page and time are included automatically to help us understand your feedback.")}</p><details><summary>{t("Welche Daten werden übermittelt?", "What data is included?")}</summary><p>{t("Zusätzlich werden Sprache, Seitentitel, Browser und Fenstergröße übermittelt. Dein Chatverlauf wird nicht mitgesendet. Bitte keine vertraulichen Angaben eintragen.", "Language, page title, browser and viewport size are also included. Your chat history is not sent. Please do not enter confidential information.")}</p></details></div></div>
    <div className="feedback-messages" aria-live="polite" aria-atomic="true">
      {status === "error" && <p className="feedback-field-error" role="alert">{t("Das Feedback konnte nicht gesendet werden. Bitte versuche es erneut.", "Your feedback could not be sent. Please try again.")}</p>}
      {Object.keys(errors).length > 0 && <p className="feedback-validation-summary">{t("Bitte prüfe die markierten Felder.", "Please check the highlighted fields.")}</p>}
    </div>
    <button className="feedback-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? t("Wird gesendet …", "Sending …") : t("Senden", "Send")}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>
  </form>;
}
