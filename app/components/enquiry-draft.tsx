"use client";
import { useRef, useState } from "react";

export function EnquiryDraft({ answer, en, recipient }: { answer:string; en:boolean; recipient?:string }) {
  const [text, setText] = useState(answer);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);

  function openEditor(select = false) {
    setEditing(true);
    requestAnimationFrame(() => {
      field.current?.focus();
      if (select) field.current?.select();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(en ? "Draft copied." : "Entwurf kopiert.");
    } catch {
      openEditor(true);
      setNotice(en ? "Your draft is selected. Use your device’s Copy command." : "Der Entwurf ist markiert. Nutze die Kopierfunktion deines Geräts.");
    }
  }

  return <div className="enquiry-draft">
    {editing ? <label>{en ? "Your email draft" : "Dein E-Mail-Entwurf"}
      <textarea ref={field} value={text} maxLength={4000} rows={8} onChange={e => {setText(e.target.value); setNotice("");}}/>
    </label> : <p className="chat-answer">{text}</p>}
    <div className="enquiry-actions">
      <button type="button" ref={editButton} onClick={() => {
        setNotice("");
        if (editing) {setEditing(false); editButton.current?.focus();}
        else openEditor();
      }}>{editing ? (en?"Done editing":"Fertig") : (en?"Edit draft":"Entwurf bearbeiten")}</button>
      <button type="button" onClick={copy} disabled={!text.trim()}>{en?"Copy draft":"Entwurf kopieren"}</button>
      {recipient && text.trim() && <a href={"mailto:"+recipient+"?subject="+encodeURIComponent(en?"Enquiry for ForJu":"Anfrage an ForJu")+"&body="+encodeURIComponent(text)}>
        {en?"Open in email app":"In Mail-App öffnen"}
      </a>}
    </div>
    <span role="status">{notice}</span>
  </div>;
}
