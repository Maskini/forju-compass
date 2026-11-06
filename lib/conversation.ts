import type { ChatMessage } from "./chat";

type Intent = "hello" | "thanks" | "bye" | "help" | "checkIn" | "ack" | "clarify";
const greetings = /^(?:hi+|hey+|hello+|hallo+|huhu|moin|servus|grüß gott|grüß dich|guten (?:morgen|tag|abend)|good (?:morning|afternoon|evening))(?: (?:there|zusammen|compass|forju(?: compass)?))?$/u;
function intent(text: string): Intent | undefined {
  if (/^👋[\u{1f3fb}-\u{1f3ff}]?[\ufe0f! .]*$/u.test(text.trim())) return "hello";
  const s = text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  if (greetings.test(s)) return "hello";
  if (/^(?:(?:ok|okay|super|perfekt|alles klar|great|perfect) )?(?:vielen dank|danke(?: dir| schön| sehr)?|dankeschön|thanks(?: a lot| so much)?|thank you(?: very much| so much)?)(?: compass)?$/.test(s)) return "thanks";
  if (/^(?:ok(?:ay)?|alles klar|verstanden|got it|that makes sense|sounds good)$/.test(s)) return "ack";
  if (/^(?:das verstehe ich nicht|ich verstehe (?:das )?nicht|i (?:don t|do not) understand|i m confused)$/.test(s)) return "clarify";
  if (/^(?:tschüss|tschau|auf wiedersehen|bis bald|bye(?: bye)?|goodbye|see you)$/.test(s)) return "bye";
  if (/^(?:hilfe|help|was kannst du(?: machen)?|wie kannst du mir helfen|kannst du mir helfen|wer bist du|what can you do|how can you help(?: me)?|can you help(?: me)?|who are you)$/.test(s)) return "help";
  if (/^(?:wie geht(?: es dir| s dir| s|s dir|s)|how are you(?: doing)?)$/.test(s)) return "checkIn";
}
export function questionAfterGreeting(text: string) {
  // Remove only a salutation, never the question following it.
  return text.replace(/^(?:hi+|hey+|hello+|hallo+|moin|servus|guten (?:morgen|tag|abend)|good (?:morning|afternoon|evening)|danke|thanks|thank you)(?:\s+(?:compass|forju compass))?(?:\s*[,!:;.—👋]+\s*|\s+(?=(?:how|who|can|what|where|which|wie|wo|was|wer|welche|kann|und|and)\b))/iu,"").trim() || text;
}
export function conversationalReply(text: string, englishUI: boolean) {
  const kind = intent(text) ?? intent(questionAfterGreeting(text));
  if (!kind) return null;
  const en = /\b(?:hello|thanks|thank|good|goodbye|bye|are|help|you)\b/i.test(text) ? true
    : /\b(?:hallo|servus|moin|guten|danke|dank|hilfe|du|dir|auf wiedersehen|bis bald)\b|tschüss|dankeschön|grüß/i.test(text) ? false : englishUI;
  const replies: Record<Intent,[string,string]> = {
    hello:["Hallo! 👋 Was führt dich zu ForJu? Erzähl mir gern von deiner Idee oder stell mir eine Frage.","Hi! 👋 What brings you to ForJu? Tell me about your idea or ask me a question."],
    ack:["Alles klar. Wenn noch etwas offen ist, frag gerne nach.","Got it. If anything else comes up, just ask."],
    clarify:["Welcher Teil ist unklar? Geht es um ein Wort in meiner Antwort oder darum, was du als Nächstes tun kannst?","Which part was unclear: a term I used, or what you can do next?"],
    thanks:["Gerne! Wenn du noch eine Frage hast, frag einfach.","You’re welcome! Feel free to ask if anything else comes up."],
    bye:["Bis bald! Viel Erfolg mit deinem Vorhaben.","Bye! Good luck with your project."],
    help:["Ich bin ForJu Compass. Ich kann dir zum Beispiel helfen, einen Workshop für deine Klasse zu finden oder aus einer Projektidee einen Entwurf zu machen. Was möchtest du tun?","I’m ForJu Compass. I can help you find a workshop for your class or turn a project idea into a draft. What would you like to do?"],
    checkIn:["Danke der Nachfrage! Ich bin bereit. Wobei kann ich dir helfen?","Thanks for asking! I’m ready to help. What are you working on?"]
  };
  return replies[kind][en?1:0];
}
export function topicHistory(history: ChatMessage[], keepPrompt?:(answer:string)=>boolean) {
  // A polite aside is not a new subject for “How do I sign up for it?”.
  return history.filter((_,i)=>keepPrompt?.(history[i-i%2+1].content) || !conversationalReply(history[i-i%2].content,false));
}
