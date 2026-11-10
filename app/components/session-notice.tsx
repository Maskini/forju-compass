import "./session-notice.css";
export function SessionNotice({language}:{language:"de"|"en"}) {
  return <details className="session-notice"><summary>{language==="en"?"Your conversation in this tab":"Dein Gespräch in diesem Tab"}</summary>
    <p>{language==="en"?"When your browser allows it, your conversation and project details can be restored after a reload for 30 minutes after the last edit. Use the trash button to remove them. Please leave confidential information out of the chat.":"Wenn dein Browser es erlaubt, kannst du dein Gespräch und deine Projektangaben nach dem Neuladen für 30 Minuten nach der letzten Änderung wieder aufnehmen. Mit dem Papierkorb entfernst du sie. Lass vertrauliche Angaben bitte aus dem Chat."}</p>
    <p>{language==="en"?"When AI answers are enabled, OpenAI processes your question and up to four recent exchanges, including a name if you shared one. The chat cannot send a project or report for you: use the corresponding form and its Send button.":"Wenn KI-Antworten aktiviert sind, verarbeitet OpenAI deine Frage und bis zu vier letzte Gesprächswechsel, einschließlich eines Namens, falls du ihn genannt hast. Der Chat kann kein Projekt und keine Meldung für dich absenden: Nutze dafür das jeweilige Formular und dessen Senden-Button."}</p>
  </details>;
}
