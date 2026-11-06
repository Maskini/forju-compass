"use client";

import {useId, useLayoutEffect, useRef, useState} from "react";
import "./project-draft.css";
import Image from "next/image";
import {useProjectDelivery} from "./project-delivery";
import {projectSeed} from "@/lib/project-seed";

type Language = "de" | "en";
type Turn = {question: string};
const language = {
  de:{
    launch:"Projektentwurf starten",resume:"Projektentwurf fortsetzen",offer:"Möchtest du aus deiner Idee einen Projektentwurf machen?",
    title:"Projekt einreichen",intro:"In wenigen Schritten von der Idee zum Projekt.",backChat:"Zurück zum Chat",
    local:"Kein Konto nötig. Du kannst deinen Entwurf bis zum Neuladen weiterbearbeiten.",tip:"Tipp von ForJu Compass",
    steps:["Idee & Zielsetzung","Zielgruppe","Umsetzung","Ressourcen","Wirkung","Überprüfen"],
    captions:["Worum geht es?","Wer profitiert?","Wie soll es ablaufen?","Was wird benötigt?","Was soll sich ändern?","Alles bereit?"],
    lead:["Erzähle uns von deinem Projekt. Du musst noch nicht alles wissen.","Für wen ist das Projekt gedacht?","Wie möchtet ihr eure Idee ausprobieren?","Was habt ihr schon, und wobei braucht ihr Unterstützung?","Was soll nach dem Projekt anders sein?","Lies deinen Entwurf durch. Du kannst die Angaben hier direkt ändern."],
    tips:["Ein kurzer Titel reicht. Nenne das Thema und was ihr damit machen möchtet.","Zielgruppe meint die Menschen, für die ihr etwas macht – zum Beispiel eine Schulklasse.","Beschreibe den ersten Versuch. Wenn du noch keinen Termin hast, lass den Zeitraum offen.","Denke an Material, einen Raum oder eine Person mit Fachwissen. Eine Anfrage ist noch keine Zusage.","Woran würdet ihr merken, dass eure Idee etwas bewirkt hat? Ein Beispiel genügt.","Steht im Entwurf, wobei ihr euch Unterstützung von ForJu wünscht?"],
    labels:["Projekttitel","Kurze Beschreibung","Zielgruppe","Geplante Schritte","Zeitraum","Benötigte Ressourcen","Erwartete Wirkung"],
    goals:"Ziele des Projekts",options:["Wissen vermitteln","Kreativität stärken","Forschendes Lernen fördern","Vernetzung ermöglichen","Gesellschaftliche Wirkung erzielen","Sonstiges"],
    own:"Eigenes Ziel",many:"Mehrere Antworten möglich",from:"Aus deinem Chat übernommen – du kannst den Text bearbeiten.",other:"Weitere eigene Worte aus dem Chat",
    send:"Senden",sending:"Wird gesendet …",sent:"Gesendet",
    accepted:"Dein Projekt wurde zum Versand an ForJu angenommen.",
    unavailable:"Projekte können derzeit nicht gesendet werden.",
    unsent:"Dein Projekt wurde nicht gesendet. Lass diesen Tab offen und versuche es später erneut.",
    unconfirmed:"Der Versand wurde nicht bestätigt. Dein Entwurf ist noch da. Du kannst erneut auf Senden klicken.",
    tooLong:"Kürze deinen Entwurf vor dem Senden.",
    next:"Weiter",back:"Zurück",up:"Nächste Schritte",step:"Schritt",of:"von",blank:"Noch offen",start:"Hallo ForJu-Team,",end:"Vielen Dank!"
  },
  en:{
    launch:"Start a project draft",resume:"Continue project draft",offer:"Would you like to turn your idea into a project draft?",
    title:"Prepare a project",intro:"From your first idea to a project inquiry.",backChat:"Back to chat",
    local:"No account needed. You can edit your draft here until you reload.",tip:"ForJu Compass tip",
    steps:["Idea & goals","Audience","Implementation","Resources","Impact","Review"],
    captions:["What is the idea?","Who benefits?","What is the plan?","What do you need?","What will change?","Ready to share?"],
    lead:["Tell us about your project. You don’t need all the answers yet.","Who is the project for?","How would you try out your idea?","What do you already have, and where could you use help?","What would you like to change?","Read through your draft. You can edit the details right here."],
    tips:["A short title is enough. Say what you want to explore or make.","Your audience means the people the project is for, such as a school class.","Describe your first experiment. Leave the timing blank if you don’t know yet.","Think about materials, space or someone with relevant expertise. A request does not confirm availability.","How would you know the project made a difference? One example is enough.","Does the draft say what you would like ForJu to help with?"],
    labels:["Project title","Short description","Audience","Planned steps","Timing","Resources needed","Expected impact"],
    goals:"Project goals",options:["Share knowledge","Encourage creativity","Support inquiry-based learning","Build connections","Make a social impact","Other"],
    own:"Your own goal",many:"Choose as many as apply",from:"Taken from your chat – you can edit these words.",other:"Add your own words from the chat",
    send:"Send",sending:"Sending…",sent:"Sent",
    accepted:"Your project has been accepted for delivery to ForJu.",
    unavailable:"Project sending is currently unavailable.",
    unsent:"Your project wasn’t sent. Keep this tab open and try again later.",
    unconfirmed:"Sending wasn’t confirmed. Your draft is still here. You can press Send again.",
    tooLong:"Shorten your draft before sending.",
    next:"Continue",back:"Back",up:"Coming up",step:"Step",of:"of",blank:"Still open",start:"Hello ForJu team,",end:"Thank you!"
  }
};
const sections=[[0,1],[2],[3,4],[5],[6]];
function Bulb(){return <svg aria-hidden="true" viewBox="0 0 100 110" className="draft-bulb"><g stroke="#e58c9b" strokeWidth="2.5"><path d="m17 29-10-5m19-7-6-9m54 9 7-10m2 22 10-6"/></g><path fill="#ee95a2" d="m49 12 21 11 10 19-8 21-13 18H40L27 61l-8-20 11-19z"/><path fill="#f6adba" d="m49 12-9 31-10-21z"/><path fill="#d97789" d="m49 12 13 31 8-20zM40 81l-9-40 16 19z"/><path fill="#ec8797" d="m49 12-2 48 15-17z"/><path fill="#be6075" d="M59 81H40l7-21 15-17z"/><path fill="#c66677" d="M39 81h21l-3 12-8 5-8-5z"/><path stroke="#f6bcc4" strokeWidth="2" d="m40 85 19-1m-18 6 17-1"/></svg>}
export function ProjectDraft({lang,turns,ready,widget=false}:{lang:Language;turns:Turn[];ready:boolean;widget?:boolean}){
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null), main=useRef<HTMLDivElement>(null), stage=useRef<HTMLHeadingElement>(null);
  const id=useId(),[draftLang,setDraftLang]=useState(lang),[step,setStep]=useState(-1),[fields,setFields]=useState<string[]>(Array(7).fill("")),[goals,setGoals]=useState<number[]>([]),[custom,setCustom]=useState(""),[seeded,setSeeded]=useState(false);
  const ui=language[draftLang],seed=projectSeed(turns),ctx=seed.description,review=step===5;
  const goalText=goals.flatMap(i=>i===5?(custom.trim()?[custom.trim()]:[]):[ui.options[i]]).join(", ");
  const lines=fields.flatMap((v,i)=>[v.trim()?ui.labels[i]+": "+v.trim():"",i===1&&goalText?ui.goals+": "+goalText:""].filter(Boolean));
  const message=lines.length?[ui.start,...lines,ui.end].join("\n\n"):"";
  const mail=useProjectDelivery(step >= 0, draftLang, message), en=draftLang==="en";
  const sent = mail.result === "accepted";
  const sendLabel = sent ? ui.sent : mail.busy ? ui.sending : ui.send;
  let deliveryNotice = "";
  if (sent) deliveryNotice = ui.accepted;
  else if (mail.result === "unavailable") deliveryNotice = ui.unsent;
  else if (mail.result === "error") deliveryNotice = ui.unconfirmed;
  else if (mail.tooLong) deliveryNotice = ui.tooLong;
  else if (mail.unavailable) deliveryNotice = ui.unavailable;
  function signal(open:boolean){if(widget && window.parent!==window)window.parent.postMessage({type:"forju:draft",open},"*")}
  function open(){
    if(step<0){setDraftLang(lang);setFields([seed.title,ctx,"","","","",""]);if(seed.goal){setGoals([5]);setCustom(seed.goal)}setSeeded(Boolean(ctx));setStep(0)}
    dialog.current?.showModal();signal(true)
  }
  function changeStep(next:number){setStep(next)}
  function edit(i:number,v:string){setFields(a=>a.map((x,n)=>n===i?v:x))}
  useLayoutEffect(()=>{if(step>=0 && dialog.current?.open){main.current?.scrollTo(0,0);stage.current?.focus({preventScroll:true})}},[step]);
  const field=(i:number)=><label key={i} className="draft-field"><span>{ui.labels[i]}</span>
    {i===0||i===4?<input value={fields[i]} onChange={e=>edit(i,e.target.value)} placeholder={review?ui.blank:undefined}/>:<textarea rows={review?2:i===1?3:4} value={fields[i]} onChange={e=>edit(i,e.target.value)} placeholder={review?ui.blank:undefined}/>}
    {i===1&&seeded&&!review&&<small>{ui.from}</small>}</label>;
  const goalFields=<fieldset className="draft-goals"><legend>{ui.goals}</legend><small>{ui.many}</small><div>{ui.options.map((s,i)=><label key={s}><input type="checkbox" checked={goals.includes(i)} onChange={e=>{setGoals(e.target.checked?[...goals,i]:goals.filter(x=>x!==i))}}/>{s}</label>)}</div>{goals.includes(5)&&<label className="draft-field">{ui.own}<input value={custom} onChange={e=>{setCustom(e.target.value)}}/></label>}</fieldset>;
  return <section className="project-draft">{ctx&&step<0&&<p>{language[lang].offer}</p>}<button ref={trigger} disabled={!ready} className="draft-launch" type="button" aria-haspopup="dialog" onClick={open}>{step<0?language[lang].launch:language[lang].resume} →</button>
    <dialog ref={dialog} lang={draftLang} aria-labelledby={id} onClose={()=>{signal(false);trigger.current?.focus({preventScroll:true})}} onKeyDown={e=>{if(e.key==="Escape")e.stopPropagation()}}>
     {step>=0&&<div className="draft-sheet">
      <div className="draft-bar"><Image unoptimized width={1618} height={302} src="/forju/forju-compass-logo.png" alt="ForJu Compass"/><button type="button" className="draft-dismiss" onClick={()=>dialog.current?.close()}>← {ui.backChat}</button></div>
      <div className="draft-layout" ref={main}>
       <div className="draft-rail"><h2 id={id}>{ui.title}</h2><p>{ui.intro}</p><ol>{ui.steps.map((name,i)=><li key={name}><button type="button" aria-current={step===i?"step":undefined} onClick={()=>changeStep(i)}><span>{i+1}</span><b>{name}<small>{ui.captions[i]}</small></b></button></li>)}</ol></div>
       <div className="draft-center"><div className="draft-banner"><div><strong>{ui.step} {step+1} {ui.of} 6</strong><h3 ref={stage} tabIndex={-1}>{ui.steps[step]}</h3><p>{ui.lead[step]}</p></div><Bulb/></div>
        <div className="draft-inputs">{review ? <>{field(0)}{field(1)}{goalFields}{[2,3,4,5,6].map(field)}</>:<>{sections[step].map(field)}{step===0&&goalFields}</>}
        {review&&<label className="draft-field"><span>{en?"Your email for a reply (optional)":"Deine E-Mail für Rückfragen (optional)"}</span>
          <input type="email" autoComplete="email" maxLength={254} value={mail.reply} disabled={mail.busy} onChange={e=>mail.setReply(e.target.value)} aria-invalid={!mail.validReply} aria-describedby={!mail.validReply?id+"-email-error":undefined}/>
          {!mail.validReply&&<small id={id+"-email-error"}>{en?"Check the address or leave it blank.":"Prüfe die Adresse oder lass sie leer."}</small>}
        </label>}
        {step===0&&turns.some(t=>!fields[1].includes(t.question))&&<details className="draft-excerpts"><summary>{ui.other}</summary>{turns.filter(t=>!fields[1].includes(t.question)).map((t,i)=><button key={i} onClick={()=>edit(1,[fields[1],t.question].filter(Boolean).join("\n"))}>{t.question}</button>)}</details>}</div>
       </div>
       <div className="draft-guide"><Image unoptimized width={1618} height={302} src="/forju/forju-compass-logo.png" alt="" className="draft-guide-logo"/><div className="draft-tip"><strong>✧　{ui.tip}</strong><p>{ui.tips[step]}</p></div>{step<5&&<div className="draft-up"><strong>{ui.up}</strong><ol start={step+2}>{ui.steps.slice(step+1,step+4).map(x=><li key={x}>{x}</li>)}</ol></div>}<p className="draft-local">{ui.local}</p></div>
      </div>
      <div className="draft-footer"><div className="draft-actions">{step>0&&<button type="button" onClick={()=>changeStep(step-1)}>← {ui.back}</button>}
       {review ? (
         <button className="primary" type="button" disabled={!mail.canSend} onClick={mail.send}>{sendLabel}</button>
       ) : (
         <button className="primary" type="button" onClick={()=>changeStep(step+1)}>{ui.next} →</button>
       )}</div>
       <div role="status" className="draft-status">{review ? deliveryNotice : step === 0 && mail.unavailable ? ui.unavailable : ""}</div>
      </div>
     </div>}
    </dialog></section>
}
