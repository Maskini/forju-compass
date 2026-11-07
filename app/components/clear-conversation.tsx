"use client";
import {useId, useImperativeHandle, useRef, useState, type Ref} from "react";
import "./clear-conversation.css";

export type ClearConversationControls = {open:()=>void};
export function ClearConversation({language, ready, onClear, widget=false, showLabel=false, ref}: {
  language:"de"|"en"; ready:boolean; onClear:()=>void; widget?:boolean; showLabel?:boolean; ref?:Ref<ClearConversationControls>;
}) {
  const en=language==="en", id=useId();
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null), cancel=useRef<HTMLButtonElement>(null);
  const [notice,setNotice]=useState("");
  const label=en?"Clear conversation":"Gespräch löschen";
  function signal(open:boolean) {
    if(widget && window.parent!==window) window.parent.postMessage({type:"forju:clear-dialog",open},"*");
  }
  function open() {
    if(!ready || !dialog.current || dialog.current.open)return;
    setNotice("");dialog.current.showModal();signal(true);cancel.current?.focus();
  }
  useImperativeHandle(ref,()=>({open}));
  function close() { dialog.current?.close(); }
  return <>
    {!widget&&<button ref={trigger} type="button" className="clear-chat-trigger" disabled={!ready} aria-label={label} title={label} aria-haspopup="dialog" onClick={open}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6"/></svg>{showLabel&&<span>{label}</span>}
    </button>}
    <dialog ref={dialog} className="clear-chat-dialog" aria-labelledby={id+"-title"} aria-describedby={id+"-description"} onClose={()=>{signal(false);trigger.current?.focus({preventScroll:true});}} onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{
      if(e.key==="Escape")e.stopPropagation();
      if(e.key==="Tab"){
        const buttons=e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
        const first=buttons[0], last=buttons[buttons.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    }}>
      <h2 id={id+"-title"}>{en?"Start a new conversation?":"Ein neues Gespräch beginnen?"}</h2>
      <p id={id+"-description"}>{en?"This removes the conversation and project details from this chat. Anything already sent will not be recalled.":"Das Gespräch und deine Projektangaben werden aus diesem Chat entfernt. Bereits Gesendetes wird nicht zurückgerufen."}</p>
      <div className="clear-chat-actions"><button ref={cancel} type="button" className="fj-action fj-secondary" onClick={close}>{en?"Cancel":"Abbrechen"}</button>
        <button type="button" className="fj-action" onClick={()=>{onClear();setNotice(en?"Conversation cleared. You can start again.":"Gespräch gelöscht. Du kannst neu beginnen.");close();}}>{label}</button></div>
    </dialog>
    <span className="clear-chat-notice" role="status">{notice}</span>
  </>;
}
