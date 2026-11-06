"use client";

import {useId, useRef, useState} from "react";
import "./project-draft.css";

type Language = "de" | "en";
type Turn = {question: string};
const project = /\b(project|thesis|research idea|prototype|our class|my class|we want to|we are building)\b|projekt|abschlussarbeit|diplomarbeit|forschungsfrage|unsere klasse|wir möchten|wir bauen/i;
const personal = /\b(my|our|we|i|ich|wir|mein\w*|unser\w*)\b/i;

function projectContext(turns: Turn[]) {
  const messages = turns.map(turn => turn.question.trim());
  const anchor = messages.findLastIndex(message => project.test(message) && personal.test(message));
  if (anchor < 0) return "";
  // Only use the visitor’s own words. They can remove or add excerpts before continuing.
  return messages.slice(anchor).filter((message, i) => i === 0 ||
    (personal.test(message) && !message.includes("?"))).join("\n");
}

const text = {
  en: {
    title:"Prepare a project idea", offer:"Would you like to turn your idea into a message for ForJu?",
    resume:"Continue project draft", close:"Back to chat", back:"Back", next:"Continue", skip:"Skip",
    description:"What is your project about?", seeded:"I’ve added your words from the chat. Keep or change them.",
    hint:"One sentence about what you want to find out or build is enough.",
    help:"What would you like ForJu to help with?", helpHint:"For example, finding a measuring device or someone who knows the subject.",
    date:"Is there a date ForJu should know about?", dateHint:"A rough time is enough. Skip this if you don’t know yet.",
    details:"Add a detail from your chat", finish:"Prepare draft", ready:"Your project inquiry",
    subject:"Subject (optional)", defaultSubject:"Project submission", message:"Message", copy:"Copy message",
    copied:"Message copied.", manual:"The text is selected. Use your device’s Copy command.",
    instructions:"Copy your message into the project form. Enter your Name and Email there. The subject is already filled in and you can change it.",
    local:"Your draft stays in this chat until you reload the page.", open:"Open ForJu’s project form",
    greeting:"Hello ForJu team,", helpLabel:"Help requested", dateLabel:"Timing", thanks:"Thank you!",
  },
  de: {
    title:"Projektidee vorbereiten", offer:"Möchtest du aus deiner Idee eine Nachricht an ForJu machen?",
    resume:"Projektentwurf fortsetzen", close:"Zurück zum Chat", back:"Zurück", next:"Weiter", skip:"Überspringen",
    description:"Worum geht es bei deinem Projekt?", seeded:"Deine Worte aus dem Chat stehen schon hier. Du kannst sie ändern.",
    hint:"Ein Satz dazu, was du herausfinden oder bauen möchtest, reicht.",
    help:"Wobei wünschst du dir Unterstützung von ForJu?", helpHint:"Zum Beispiel bei der Suche nach einem Messgerät oder einer Person, die sich mit dem Thema auskennt.",
    date:"Gibt es einen Termin, den ForJu kennen sollte?", dateHint:"Ein ungefährer Zeitraum reicht. Wenn du ihn noch nicht kennst, überspringe die Frage.",
    details:"Detail aus dem Chat ergänzen", finish:"Entwurf vorbereiten", ready:"Deine Projektanfrage",
    subject:"Betreff (optional)", defaultSubject:"Projekteinreichung", message:"Nachricht", copy:"Nachricht kopieren",
    copied:"Nachricht kopiert.", manual:"Der Text ist markiert. Nutze die Kopierfunktion deines Geräts.",
    instructions:"Kopiere deine Nachricht ins Projektformular. Name und E-Mail trägst du dort ein. Der Betreff ist vorausgefüllt und lässt sich ändern.",
    local:"Dein Entwurf bleibt bis zum Neuladen in diesem Chat.", open:"ForJus Projektformular öffnen",
    greeting:"Hallo ForJu-Team,", helpLabel:"Gewünschte Unterstützung", dateLabel:"Zeitraum", thanks:"Vielen Dank!",
  },
};

export function ProjectDraft({lang, turns}: {lang:Language; turns:Turn[]}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const heading = useId();
  const [draftLang,setDraftLang] = useState(lang);
  const [step,setStep] = useState(-1);
  const [answers,setAnswers] = useState(["","",""]);
  const [subject,setSubject] = useState("");
  const [message,setMessage] = useState("");
  const [notice,setNotice] = useState("");
  const [seeded,setSeeded] = useState(false);
  const ui = text[draftLang];
  const context = projectContext(turns);
  const prompts = [ui.description,ui.help,ui.date];
  function open() {
    if (step < 0) {
      setDraftLang(lang);
      setSubject(text[lang].defaultSubject);
      setAnswers([context,"",""]);
      setSeeded(Boolean(context));
      setStep(0);
    }
    setNotice("");
    dialog.current?.showModal();
  }
  function advance(skip=false) {
    const fields = answers.map((answer,i)=>skip && i===step ? "" : answer.trim());
    setAnswers(fields);
    if (step === 2) {
      setMessage(fields.some(Boolean) ? [ui.greeting, fields[0], fields[1] && ui.helpLabel+": "+fields[1],
        fields[2] && ui.dateLabel+": "+fields[2], ui.thanks].filter(Boolean).join("\n\n") : "");
    }
    setStep(step+1);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setNotice(ui.copied);
    } catch {
      messageField.current?.focus();
      messageField.current?.select();
      try { setNotice(document.execCommand("copy") ? ui.copied : ui.manual); }
      catch { setNotice(ui.manual); }
    }
  }
  return <section className="project-draft">
    {context && step<0 && <p>{text[lang].offer}</p>}
    <button type="button" className="draft-launch" onClick={open}>{step<0?text[lang].title:text[lang].resume} →</button>
    <dialog ref={dialog} lang={draftLang} aria-labelledby={heading} onKeyDown={e=>{if(e.key==="Escape")e.stopPropagation()}}>
      <div className="draft-sheet">
        <button type="button" className="draft-dismiss" onClick={()=>dialog.current?.close()}>{ui.close} ×</button>
        <h2 id={heading}>{step===3?ui.ready:ui.title}</h2>
        {step>=0 && step<3 && <>
          <label>{prompts[step]}
            <small>{[seeded?ui.seeded:ui.hint,ui.helpHint,ui.dateHint][step]}</small>
            <textarea value={answers[step]} onChange={e=>setAnswers(answers.map((v,i)=>i===step?e.target.value:v))}/>
          </label>
          {step===0 && turns.some(t=>!answers[0].includes(t.question)) && <details><summary>{ui.details}</summary>
            {turns.filter(t=>!answers[0].includes(t.question)).map((turn,i)=><button type="button" key={i} onClick={()=>setAnswers([[answers[0],turn.question].filter(Boolean).join("\n"),answers[1],answers[2]])}>{turn.question}</button>)}
          </details>}
          <div className="draft-actions">
            {step>0 && <button type="button" onClick={()=>setStep(step-1)}>{ui.back}</button>}
            <button type="button" onClick={()=>advance(true)}>{ui.skip}</button>
            <button type="button" className="primary" onClick={()=>advance()}>{step===2?ui.finish:ui.next}</button>
          </div>
          <small>{ui.local}</small>
        </>}
        {step===3 && <>
          <p>{ui.instructions}</p><label>{ui.subject}<input value={subject} onChange={e=>setSubject(e.target.value)}/></label>
          <label>{ui.message}<textarea ref={messageField} rows={8} value={message} onChange={e=>{setMessage(e.target.value);setNotice("")}}/></label>
          <div className="draft-actions"><button type="button" disabled={!message.trim()} onClick={copy}>{ui.copy}</button>
            <a className="primary" href={'https://forju.at/'+draftLang+'/kontakt?intent=projekt'} target="_blank" rel="noopener noreferrer">{ui.open} ↗</a></div>
          <small role="status">{notice}</small>
        </>}
      </div>
    </dialog>
  </section>;
}
