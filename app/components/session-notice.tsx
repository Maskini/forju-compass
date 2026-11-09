import "./session-notice.css";
export function SessionNotice({language}:{language:"de"|"en"}) {
  return <details className="session-notice"><summary>{language==="en"?"Your conversation in this tab":"Dein Gespräch in diesem Tab"}</summary>
    <p>{language==="en"?"When your browser allows it, your conversation and project details can be restored after a reload for 30 minutes after the last edit. Use the trash button to remove them. Please leave confidential information out of the chat.":"Wenn dein Browser es erlaubt, kannst du dein Gespräch und deine Projektangaben nach dem Neuladen für 30 Minuten nach der letzten Änderung wieder aufnehmen. Mit dem Papierkorb entfernst du sie. Lass vertrauliche Angaben bitte aus dem Chat."}</p>
  </details>;
}
