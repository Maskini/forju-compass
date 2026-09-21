"use client";
import { useState } from "react";

export default function KnowledgeFeedback({ question, language = "de" }: { question: string; language?: "de" | "en" }) {
  const t = (de: string, en: string) => language === "en" ? en : de;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(question);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <button className="knowledge-feedback-toggle" type="button" onClick={() => setOpen(true)}>{t("Fehlt eine Information?", "Is any information missing?")}</button>;
  return <form className="knowledge-feedback" onSubmit={async event => {
    event.preventDefault(); if(busy) return;
    setBusy(true);setStatus("");
    try {
      const response = await fetch("/api/knowledge-feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:draft,consent:true})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error);
      setStatus(t("Danke. Deine Frage wurde zur Wissensprüfung gespeichert.", "Thank you. Your question was saved for knowledge review."));
    } catch { setStatus(t("Die Frage konnte nicht gespeichert werden. Bitte versuche es später erneut.", "Your question could not be saved. Please try again later.")); }
    finally {setBusy(false);}
  }}>
    <label>{t("Frage zur Wissensprüfung", "Question for knowledge review")}<textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} required /></label>
    <p>{t("Beim Senden wird nur diese Frage für die Prüfung gespeichert. Entferne persönliche oder vertrauliche Angaben. Daraus entsteht keine automatische Wissensänderung.", "Only this question is saved for review when you submit it. Remove personal or confidential details. This does not automatically change the knowledge base.")}</p>
    <button type="submit" disabled={busy || !draft.trim()}>{t("Frage zur Prüfung senden", "Send question for review")}</button>
    <button type="button" onClick={() => setOpen(false)}>{t("Schließen", "Close")}</button>
    <p role="status">{status}</p>
  </form>;
}
