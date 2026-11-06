"use client";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { AppLanguage } from "@/lib/language";
import FeedbackForm from "./FeedbackForm";
import ReportIcon from "./ReportIcon";

export type ReportedExchange = {question:string; answer:string};
export type ReportControls = {reportAnswer:(turn:ReportedExchange, trigger:HTMLButtonElement)=>void};
export default function FeedbackWidget({language, ready, inline=false, ref}: {
  language:AppLanguage; ready:boolean; inline?:boolean; ref?:Ref<ReportControls>;
}) {
  const [exchange,setExchange] = useState<ReportedExchange>();
  const [formVersion,setFormVersion] = useState(0);
  const previousTarget = useRef<ReportedExchange | null>(null);
  const accepted = useRef(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreScroll = useRef<(() => void) | null>(null);
  const t = (de: string, en: string) => language === "en" ? en : de;
  useEffect(() => () => restoreScroll.current?.(), []);
  useImperativeHandle(ref,()=>({reportAnswer:(turn,button)=>open(turn,button)}));
  function open(turn?:ReportedExchange, button?:HTMLButtonElement) {
    if (!dialog.current || dialog.current.open) return;
    if (accepted.current || previousTarget.current !== (turn ?? null)) setFormVersion(v=>v+1);
    accepted.current=false;
    previousTarget.current=turn ?? null;
    setExchange(turn ? {question:turn.question, answer:turn.answer} : undefined);
    opener.current=button ?? trigger.current;
    const previous = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap) document.body.style.paddingRight = `${gap}px`;
    restoreScroll.current = () => { document.body.style.overflow = previous; document.body.style.paddingRight = previousPadding; restoreScroll.current = null; };
    dialog.current.showModal();
    if (inline && parent !== window) parent.postMessage({type:"forju:report",open:true},"*");
    dialog.current.querySelector<HTMLButtonElement>(".feedback-close")?.focus();
  }
  function closed() {
    if (inline && parent !== window) parent.postMessage({type:"forju:report",open:false},"*");
    restoreScroll.current?.(); opener.current?.focus({preventScroll:true});
  }
  return <>
    <button ref={trigger} type="button" disabled={!ready} className={inline?"report-inline":"feedback-launcher fj-action"} onClick={()=>open()} aria-haspopup="dialog" aria-controls="feedback-drawer">
      {t("Problem melden", "Report a problem")}
    </button>
    <dialog ref={dialog} id="feedback-drawer" className="feedback-drawer" aria-labelledby="feedback-title" aria-describedby="feedback-subtitle" onClose={closed} onCancel={event => { event.preventDefault(); dialog.current?.close(); }} onKeyDown={event => {
      if (event.key === "Escape") event.stopPropagation();
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea, summary, [tabindex="0"]')].filter(element => !element.matches(':disabled, [tabindex="-1"]') && element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="feedback-drawer-header">
        <span className="feedback-report-badge"><ReportIcon /></span>
        <button type="button" className="feedback-close" aria-label={inline ? t("Zurück zum Chat", "Back to chat") : t("Feedback schließen", "Close feedback")} onClick={() => dialog.current?.close()}>{inline ? t("Zurück zum Chat", "Back to chat") : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>}</button>
      </div>
      <h2 id="feedback-title">{t("Problem melden", "Report a problem")}</h2>
      <p id="feedback-subtitle">{t("Was ist dir aufgefallen? Beschreibe kurz, was wir verbessern können.", "What happened? Tell us what we can improve.")}</p>
      <FeedbackForm key={formVersion} language={language} exchange={exchange} onAccepted={()=>{accepted.current=true}} />
    </dialog>
  </>;
}
