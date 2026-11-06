"use client";
import {ChatChoices} from "@/app/components/chat-choices";
import {useEffect,useEffectEvent,useRef,useState} from "react";
import FeedbackWidget, {type ReportControls} from "@/app/components/feedback/FeedbackWidget";
import {ProjectDraft} from "@/app/components/project-draft";
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
  const paths:Record<string,string>={projects:"M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 .8-2 2-2 3h-4c0-1-1-2.2-2-3Z",volunteer:"M3 20v-2a5 5 0 0 1 10 0v2m2-7a5 5 0 0 1 6 5v2M8 4a3.5 3.5 0 1 0 .01 0m8 1a3 3 0 1 1 0 6",funding:"m2 9 10-5 10 5-10 5L2 9Zm4 2v5q6 5 12 0v-5m4-2v7",idea:"M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h5",send:"m3 11 18-8-6 18-4-7-8-3Zm8 3L21 3",clip:"m8 14 6-7a2 2 0 0 1 3 3l-7 8a4 4 0 1 1-6-5l8-9a5 5 0 1 1 8 7l-8 9",user:"M12 3a4 4 0 1 0 .01 0M4 21a8 8 0 0 1 16 0",help:"M4 14v-3a8 8 0 0 1 16 0v6q0 4-5 4m-11-9h3v6H4Zm13 0h3v6h-3Z"};
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]}/></svg>;
}
export default function CompassPanel({initialLanguage,widget=false}:{initialLanguage:"de"|"en";widget?:boolean}){
  const [lang,setLang]=useState(initialLanguage), en=lang==="en";
  const {ready,question,setQuestion,turns,transcript,loading,error,submittedQuestion,submit}=useCompassChat(lang);
  const [fileError,setFileError]=useState(""),file=useRef<HTMLInputElement>(null);
  const pending=useRef<{topic:Topic;lang:"en"|"de"}|null>(null);
  const handleMessage=useEffectEvent((e:MessageEvent)=>{
    if(!widget||e.source!==window.parent||e.data?.type!=="forju:open")return;
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
    if(!widget||window.parent===window)return;
    const message=(e:MessageEvent)=>handleMessage(e);
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")window.parent.postMessage({type:"forju:close"},"*")};
    window.addEventListener("message",message);window.addEventListener("keydown",key);
    window.parent.postMessage({type:"forju:ready"},"*");
    return ()=>{window.removeEventListener("message",message);window.removeEventListener("keydown",key)};
  },[widget]);
  const reports = useRef<ReportControls>(null);
  const suggestions:Topic[]=["projects","volunteer","funding","idea"];
  return <main lang={lang} className={"embed-panel"+(widget?" widget-mode":"")}>
    <header><img src="/forju/forju-compass-logo.png" alt="ForJu Compass"/><p>{en?"Your AI assistant for youth, research and opportunities.":"Dein KI-Assistent für Jugend, Forschung und Möglichkeiten."}</p>
      {!widget&&<button className="lang" onClick={()=>setLang(en?"de":"en")}>{en?"DE":"EN"}</button>}
    </header>
    <div className="embed-log" ref={transcript} tabIndex={0} aria-label={en?"Conversation":"Gespräch"}>
      <section className="greeting"><img src="/forju/origami/pink-airplane.png" alt=""/><h1>{en?"Hello!":"Hallo!"} 👋</h1>
        <p>{en?"I’m ForJu Compass. Ask me about projects, support for young researchers and ways to get involved.":"Ich bin ForJu Compass und unterstütze dich bei Fragen zu unseren Projekten, Angeboten und rund um Forschung und Engagement für junge Menschen."}</p>
        <h2>{en?"Popular questions":"Beliebte Fragen"}</h2>
        <div className="suggestions">{suggestions.map(t=><button className={t} key={t} disabled={!ready||loading} onClick={()=>submit(prompts[t][en?1:0])}><i><Icon type={t}/></i><span>{prompts[t][en?1:0]}</span><b>›</b></button>)}</div>
      </section>
      <div role="log" aria-live="polite" aria-relevant="additions">{turns.map((turn,i)=><article key={i}>
        <div className="question-bubble"><p>{turn.question}</p><i><Icon type="user"/></i></div>
        <div className="response"><i className="compass-avatar" aria-hidden="true"/><div><p>{turn.answer}</p>
        {turn.library&&<small>{en?"Public knowledge catalog":"Öffentlicher Wissenskatalog"}</small>}</div></div>
        <button type="button" className="report-answer" aria-haspopup="dialog" onClick={e=>reports.current?.reportAnswer(turn,e.currentTarget)}>{en?"Report this answer":"Diese Antwort melden"}</button>
        <time dateTime={new Date(turn.answeredAt).toISOString()}>{new Date(turn.answeredAt).toLocaleTimeString(lang,{hour:"2-digit",minute:"2-digit"})}</time>
        {!!turn.sources.length&&<nav className="read-more" aria-label={en?"Read more":"Mehr dazu"}>{turn.sources.map(s=><a href={s.url} key={s.url} target="_blank" rel="noopener noreferrer"><Icon type="idea"/><span><strong>{s.title}</strong><small>{new URL(s.url).hostname}</small></span><b aria-hidden="true">↗</b></a>)}</nav>}
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
          : source.includes("science-beratung")
          ? [en?"Tell ForJu about your project":"Projektidee einreichen","/kontakt?intent=projekt"]
          : source.includes("schulworkshops") ? [en?"Enquire about a school workshop":"Schulworkshop anfragen","/kontakt?intent=service"] : null;
        return action && <a className="next-step" href={"https://forju.at/"+(source.startsWith("https://forju.at/en/")?"en":"de")+action[1]} target="_blank" rel="noopener noreferrer">{action[0]} →</a>
      })()}
      <FeedbackWidget ref={reports} inline language={lang}/>
      <ProjectDraft lang={lang} turns={turns} widget={widget}/>
      {loading&&<div role="status"><div className="question-bubble"><p>{submittedQuestion}</p></div>{en?"Looking for an answer…":"Ich suche eine Antwort …"}</div>}
      {error&&<p role="alert">{en?"Your question could not be sent.":"Deine Frage konnte nicht gesendet werden."} <button onClick={()=>submit(submittedQuestion)}>{en?"Retry":"Erneut versuchen"}</button>{" · "}<a href={"https://forju.at/"+lang+"/kontakt"} target="_blank" rel="noopener noreferrer">{en?"Contact ForJu":"ForJu kontaktieren"}</a></p>}
    </div>
    <aside><i><Icon type="help"/></i><div><strong>{en?"Have a specific question?":"Noch eine spezifische Frage?"}</strong><span>{en?"Our team can help you personally.":"Unser Team hilft dir gerne persönlich weiter."}</span></div><a href={'https://forju.at/'+lang+'/kontakt'} target="_blank" rel="noopener noreferrer">{en?"Contact us":"Kontakt aufnehmen"} →</a></aside>
    <form onSubmit={e=>{e.preventDefault();void submit()}}><div className="composer">
      <input ref={file} type="file" hidden accept=".txt,.md,text/plain,text/markdown" onChange={async e=>{
        const f=e.target.files?.[0];e.target.value="";if(!f)return;
        try{if(!/\.(txt|md)$/i.test(f.name)||f.size>MAX_MESSAGE_LENGTH*4)throw Error();
          const next=[question,(await f.text()).trim()].filter(Boolean).join("\n");
          if(next.length>MAX_MESSAGE_LENGTH)throw Error();setQuestion(next);setFileError("");
        }catch{setFileError(en?"Choose a TXT or Markdown file that fits in the 2,000-character question.":"Bitte eine TXT- oder Markdown-Datei wählen, die in die Frage mit 2.000 Zeichen passt.");}
      }}/>
      <button type="button" title={en?"Insert text from a file":"Text aus Datei einfügen"} aria-label={en?"Insert text from a file":"Text aus Datei einfügen"} onClick={()=>file.current?.click()}><Icon type="clip"/></button>
      <input disabled={!ready} aria-label={en?"Your question":"Deine Frage"} type="text" maxLength={MAX_MESSAGE_LENGTH} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={!ready?(en?"Opening Compass…":"Compass lädt …"):en?"Ask ForJu Compass…":"Stelle deine Frage an ForJu Compass …"}/>
      <button className="send" type="submit" disabled={!ready||loading||!question.trim()} aria-label={en?"Send question":"Frage senden"}><Icon type="send"/></button></div>
      {fileError&&<span role="alert">{fileError}</span>}
      <small>{en?"ForJu Compass can make mistakes. Please check important information.":"ForJu Compass kann Fehler machen. Bitte prüfe wichtige Informationen."}</small>
    </form>
  </main>
}
