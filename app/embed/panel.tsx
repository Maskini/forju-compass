"use client";
import {SessionNotice} from "@/app/components/session-notice";
import {LimitedAnswer} from "@/app/components/limited-answer";
import {EnquiryDraft} from "@/app/components/enquiry-draft";
import {ChatChoices} from "@/app/components/chat-choices";
import {useEffect,useEffectEvent,useRef,useState} from "react";
import FeedbackWidget, {type ReportControls} from "@/app/components/feedback/FeedbackWidget";
import {ProjectDraft} from "@/app/components/project-draft";
import {ClearConversation, type ClearConversationControls} from "@/app/components/clear-conversation";
import {useCompassChat} from "@/lib/use-compass-chat";
import {MAX_MESSAGE_LENGTH} from "@/lib/chat";
import "./panel.css";

const prompts = {
  volunteer:["Wie kann ich mich ehrenamtlich engagieren?","How can I volunteer?"],
  projects:["Welche Projekte gibt es bei ForJu?","What projects does ForJu offer?"],
  audience:["Für wen ist ForJu gedacht?","Who is ForJu for?"],
  funding:["Welche Fördermöglichkeiten gibt es für Schüler:innen?","How can students find project funding?"],
  idea:["Kannst du mir bei einer Forschungsprojektidee helfen?","Can you help me develop a research idea?"],
} as const;
type Topic=keyof typeof prompts;
function Icon({type}:{type:string}){
  const paths:Record<string,string>={projects:"M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 .8-2 2-2 3h-4c0-1-1-2.2-2-3Z",volunteer:"M3 20v-2a5 5 0 0 1 10 0v2m2-7a5 5 0 0 1 6 5v2M8 4a3.5 3.5 0 1 0 .01 0m8 1a3 3 0 1 1 0 6",funding:"m2 9 10-5 10 5-10 5L2 9Zm4 2v5q6 5 12 0v-5m4-2v7",idea:"M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h5",send:"m3 11 18-8-6 18-4-7-8-3Zm8 3L21 3",user:"M12 3a4 4 0 1 0 .01 0M4 21a8 8 0 0 1 16 0",help:"M4 14v-3a8 8 0 0 1 16 0v6q0 4-5 4m-11-9h3v6H4Zm13 0h3v6h-3Z"};
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]}/></svg>;
}
export default function CompassPanel({initialLanguage,widget=false}:{initialLanguage:"de"|"en";widget?:boolean}){
  const [lang,setLang]=useState(initialLanguage), en=lang==="en";
  const {ready,question,setQuestion,turns,transcript,loading,error,submittedQuestion,submit,conversationId,clearConversation}=useCompassChat(lang);
  const clearControl=useRef<ClearConversationControls>(null);
  const pending=useRef<{topic:Topic;lang:"en"|"de"}|null>(null);
  const handleMessage=useEffectEvent((e:MessageEvent)=>{
    if(!widget||e.source!==window.parent)return;
    if(e.data?.type==="forju:hide"){
      // Native close handlers retain form fields and release their scroll locks.
      document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(dialog=>dialog.close());
      return;
    }
    if(e.data?.type==="forju:clear-request"){clearControl.current?.open();return;}
    if(e.data?.type!=="forju:open")return;
    const next=e.data.lang==="en"?"en":"de";
    setLang(next);
    if(typeof e.data.topic==="string"&&Object.hasOwn(prompts,e.data.topic)){
      const topic=e.data.topic as Topic;
      if(loading)pending.current={topic,lang:next};
      else void submit(prompts[topic][next==="en"?1:0],next);
    }
  });
  const drain=useEffectEvent(()=>{
    const item=pending.current;
    if(!loading&&item){pending.current=null;void submit(prompts[item.topic][item.lang==="en"?1:0],item.lang);}
  });
  useEffect(()=>{drain()},[loading]);
  useEffect(()=>{document.documentElement.lang=lang},[lang]);
  useEffect(()=>{
    if(!widget||!ready||window.parent===window)return;
    const message=(e:MessageEvent)=>handleMessage(e);
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")window.parent.postMessage({type:"forju:close"},"*")};
    window.addEventListener("message",message);window.addEventListener("keydown",key);
    window.parent.postMessage({type:"forju:ready"},"*");
    return ()=>{window.removeEventListener("message",message);window.removeEventListener("keydown",key)};
  },[widget,ready]);
  const reports = useRef<ReportControls>(null);
  const suggestions:Topic[]=["projects","volunteer","funding","idea"];
  return <main lang={lang} className={"embed-panel"+(widget?" widget-mode":"")}>
    <header><img src="/forju/forju-compass-logo.png" alt="ForJu Compass"/>
      <ClearConversation ref={clearControl} ready={ready} language={lang} widget={widget} onClear={()=>{pending.current=null;clearConversation();}}/>
      {!widget&&<button className="lang" onClick={()=>setLang(en?"de":"en")}>{en?"DE":"EN"}</button>}
    </header>
    <div data-read-latest="start" className="embed-log" ref={transcript} tabIndex={0} aria-label={en?"Conversation":"Gespräch"}>
      <section className="greeting"><img src="/forju/origami/pink-airplane.png" alt=""/><h1>{en?"How can we help?":"Wie können wir dir helfen?"}</h1>
        <p>{en?"Ask about a school workshop, explore funding or tell us what you’d like to research.":"Frag nach einem Schulworkshop, finde Unterstützung oder erzähl uns, was du erforschen möchtest."}</p>
        <SessionNotice language={lang}/>
        <h2>{en?"Popular questions":"Beliebte Fragen"}</h2>
        <div className="suggestions">{suggestions.map(t=><button className={t} key={t} disabled={!ready||loading} onClick={()=>submit(prompts[t][en?1:0])}><i><Icon type={t}/></i><span>{prompts[t][en?1:0]}</span><b aria-hidden="true">→</b></button>)}</div>
      </section>
      <div role="log" aria-live="polite" aria-relevant="additions">{turns.map((turn,i)=><article key={i}>
        <div className="question-bubble"><p>{turn.question}</p><i><Icon type="user"/></i></div>
        <div className="response"><i className="compass-avatar" aria-hidden="true"/><div>{turn.draft ? <EnquiryDraft answer={turn.answer} recipient={turn.recipient} en={en}/> : <p>{turn.answer}</p>}</div></div>
        {turn.limited&&<LimitedAnswer en={en}/>}
        {!!turn.sources.length&&<nav className="read-more" aria-label={en?"Read more":"Mehr dazu"}>{turn.sources.map(s=><a className="fj-action fj-source" href={s.url} key={s.url} target="_blank" rel="noopener noreferrer"><span>{s.title}</span><span aria-hidden="true">↗</span></a>)}</nav>}
        <div className="answer-meta"><button type="button" className="report-answer" aria-haspopup="dialog" onClick={e=>reports.current?.reportAnswer(turn,e.currentTarget)}>{en?"Report this answer":"Diese Antwort melden"}</button>
        <time dateTime={new Date(turn.answeredAt).toISOString()}>{new Date(turn.answeredAt).toLocaleTimeString(lang,{hour:"2-digit",minute:"2-digit"})}</time></div>
        {i===turns.length-1 && !loading && !error && <ChatChoices choices={turn.suggestions} onChoose={submit}/>}
      </article>)}</div>
      {turns.length>0 && !loading && (()=>{
        const source=turns.at(-1)?.sources[0]?.url;
        if(!source || !source.startsWith("https://forju.at/"))return null;
        const action=source.includes("/jobs")||source.includes("/ueber-uns")
          ? [en?"View volunteer roles":"Ehrenamtliche Stellen ansehen","/jobs"]
          : source.includes("/services/ressourcen")
          ? [en?"Ask about rooms or equipment":"Räume oder Geräte anfragen","/kontakt?intent=service&thema=ressourcen"]
          : source.includes("/services/finanziell")
          ? [en?"Request funding support":"Finanzierungshilfe anfragen","/kontakt?intent=service&thema=finanziell"]
          : source.includes("schulworkshops") ? [en?"Enquire about a school workshop":"Schulworkshop anfragen","mailto:anja.hofer@forju.at"] : null;
        return action && <a className="next-step" href={action[1].startsWith("mailto:") ? action[1] : "https://forju.at/"+(source.startsWith("https://forju.at/en/")?"en":"de")+action[1]} target="_blank" rel="noopener noreferrer">{action[0]} →</a>
      })()}
      <ProjectDraft key={conversationId} ready={ready} lang={lang} turns={turns} widget={widget}/>
      {loading&&<div role="status"><div className="question-bubble"><p>{submittedQuestion}</p></div>{en?"Looking for an answer…":"Ich suche eine Antwort …"}</div>}
      {error&&<p role="alert">{en?"Your question could not be sent.":"Deine Frage konnte nicht gesendet werden."} <button onClick={()=>submit(submittedQuestion)}>{en?"Retry":"Erneut versuchen"}</button>{" · "}<a href={"https://forju.at/"+lang+"/kontakt"} target="_blank" rel="noopener noreferrer">{en?"Contact ForJu":"ForJu kontaktieren"}</a></p>}
    </div>
    <aside><i><Icon type="help"/></i><div><strong>{en?"Want to ask the team?":"Direkt mit ForJu sprechen?"}</strong><span>{en?"Our team can help you personally.":"Unser Team hilft dir gerne persönlich weiter."}</span></div><a className="fj-action" href={'https://forju.at/'+lang+'/kontakt'} target="_blank" rel="noopener noreferrer">{en?"Contact us":"Kontakt aufnehmen"} →</a></aside>
    <div className="panel-report">
      <FeedbackWidget key={conversationId} ready={ready} ref={reports} inline language={lang}/>
    </div>
    <form onSubmit={e=>{e.preventDefault();void submit()}}><div className="composer fj-field">
      <input disabled={!ready} aria-label={en?"Your question":"Deine Frage"} type="text" maxLength={MAX_MESSAGE_LENGTH} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={!ready?(en?"Opening Compass…":"Compass lädt …"):en?"Ask ForJu Compass…":"Stelle deine Frage an ForJu Compass …"}/>
      <button className="send fj-action" type="submit" disabled={!ready||loading||!question.trim()} aria-label={en?"Send question":"Frage senden"}><Icon type="send"/></button></div>
      <small><span>{en?"ForJu Compass can make mistakes. Please check important information.":"ForJu Compass kann Fehler machen. Bitte prüfe wichtige Informationen."}</span><span className="beta-label">Beta</span></small>
    </form>
  </main>
}
