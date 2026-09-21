"use client";
import { useEffect, useRef } from "react";
import { useAppLanguage } from "@/lib/language";
import FeedbackForm from "./FeedbackForm";
import ReportIcon from "./ReportIcon";

export default function FeedbackWidget() {
  const language = useAppLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreScroll = useRef<(() => void) | null>(null);
  const t = (de: string, en: string) => language === "en" ? en : de;
  useEffect(() => () => restoreScroll.current?.(), []);
  function open() {
    if (!dialog.current || dialog.current.open) return;
    const previous = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap) document.body.style.paddingRight = `${gap}px`;
    restoreScroll.current = () => { document.body.style.overflow = previous; document.body.style.paddingRight = previousPadding; restoreScroll.current = null; };
    dialog.current.showModal();
    dialog.current.querySelector<HTMLButtonElement>(".feedback-close")?.focus();
  }
  function closed() { restoreScroll.current?.(); trigger.current?.focus(); }
  return <>
    <button ref={trigger} type="button" className="feedback-launcher" onClick={open} aria-haspopup="dialog" aria-controls="feedback-drawer">
      <ReportIcon />
      {t("Problem melden", "Report a problem")}
    </button>
    <dialog ref={dialog} id="feedback-drawer" className="feedback-drawer" aria-labelledby="feedback-title" aria-describedby="feedback-subtitle" onClose={closed} onCancel={event => { event.preventDefault(); dialog.current?.close(); }} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea, summary, [tabindex="0"]')].filter(element => !element.matches(':disabled, [tabindex="-1"]') && element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="feedback-drawer-header">
        <span className="feedback-report-badge"><ReportIcon /></span>
        <button type="button" className="feedback-close" aria-label={t("Feedback schließen", "Close feedback")} onClick={() => dialog.current?.close()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </div>
      <h2 id="feedback-title">{t("Problem oder Feedback melden", "Report a problem or feedback")}</h2>
      <p id="feedback-subtitle">{t("Hilf uns, ForJu Compass noch besser zu machen. Deine Rückmeldung zählt.", "Help us make ForJu Compass even better. Your feedback matters.")}</p>
      <FeedbackForm language={language} />
    </dialog>
  </>;
}
