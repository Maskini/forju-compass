"use client";
import {useEffect,useRef,useState} from "react";
import {PROJECT_RECIPIENT,PROJECT_MAX_LENGTH,projectSubject} from "@/lib/project-mail";

export function ProjectDelivery({lang,message,idKey}:{lang:"de"|"en";message:string;idKey:()=>string}){
  const en=lang==="en", [direct,setDirect]=useState(false),[reply,setReply]=useState(""),[consent,setConsent]=useState(""),[accepted,setAccepted]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),lock=useRef(false);
  useEffect(()=>{const ctrl=new AbortController();void fetch("/api/project-submission",{cache:"no-store",signal:ctrl.signal}).then(r=>r.ok?r.json():null).then(v=>{if(!ctrl.signal.aborted)setDirect(v?.direct===true)}).catch(()=>{});return ()=>ctrl.abort()},[]);
  const identity=JSON.stringify([lang,message,reply.trim()]);
  const mailto="mailto:"+PROJECT_RECIPIENT+"?subject="+encodeURIComponent(projectSubject(lang))+"&body="+encodeURIComponent(message);
  const validReply=!reply.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply.trim());
  async function send(){
    if(lock.current||!direct||consent!==identity||accepted===identity||!message||!validReply)return;
    lock.current=true;setBusy(true);setError("");
    try{
      const response=await fetch("/api/project-submission",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":idKey()},body:JSON.stringify({draft:message,language:lang,confirmed:true,...(reply.trim()?{replyEmail:reply.trim()}:{})}),signal:AbortSignal.timeout(20000)});
      if(!response.ok || (await response.json()).accepted!==true){if(response.status===503)setDirect(false);throw Error()}
      setAccepted(identity);
    }catch{setError(identity)}finally{lock.current=false;setBusy(false)}
  }
  return <div className="draft-delivery"><h4>{en?"Email your draft":"Entwurf per E-Mail senden"}</h4>
    <p>{en?"Recipient: ":"Empfänger: "}<strong>{PROJECT_RECIPIENT}</strong></p>
    {direct&&message&&<><label className="draft-field">{en?"Your reply email (optional)":"Deine E-Mail für Rückfragen (optional)"}<input type="email" autoComplete="email" maxLength={254} value={reply} disabled={busy} onChange={e=>{setReply(e.target.value);setConsent("")}}/></label>
    {!validReply&&<small>{en?"Check the email address or leave it blank.":"Prüfe die Adresse oder lass sie leer."}</small>}
    <label><input type="checkbox" checked={consent===identity} disabled={busy||accepted===identity} onChange={e=>setConsent(e.target.checked?identity:"")}/> {en?"Send this reviewed draft and my optional reply email. My chat stays private.":"Diesen geprüften Entwurf und meine optionale Antwortadresse senden. Mein Chat bleibt privat."}</label>
    <button type="button" className="draft-launch" disabled={busy||consent!==identity||!validReply||accepted===identity||message.length>PROJECT_MAX_LENGTH} onClick={send}>{busy?(en?"Sending…":"Wird gesendet …"):(en?"Send draft to ForJu":"Entwurf an ForJu senden")}</button>
    {message.length>PROJECT_MAX_LENGTH&&<p>{en?"Please shorten the draft or use your email app.":"Kürze den Entwurf oder nutze dein E-Mail-Programm."}</p>}</>}
    <div role="status">{accepted===identity?(en?"The mail provider accepted your draft for delivery.":"Der E-Mail-Dienst hat deinen Entwurf zum Versand angenommen."):error===identity?(en?"Sending could not be confirmed. Your draft is still here. Retry or use your email app.":"Der Versand wurde nicht bestätigt. Dein Entwurf ist noch da. Versuche es erneut oder nutze dein E-Mail-Programm."):""}</div>
    {message&&accepted!==identity&&<><p>{en?"Open an addressed email with your draft, then press Send in your email app. If the text is missing, use Copy draft.":"Öffne eine adressierte E-Mail mit deinem Entwurf und drücke im E-Mail-Programm auf Senden. Fehlt der Text, nutze „Entwurf kopieren“."}</p><a href={mailto} target="_blank" rel="noopener noreferrer">{en?"Open in my email app ↗":"Im E-Mail-Programm öffnen ↗"}</a></>}
  </div>
}
