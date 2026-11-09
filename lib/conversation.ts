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
// Personal introductions are conversational input, not claims to retrieve from
// ForJu's catalog. Correct the cue only; never spell-correct somebody's name.
export const namePrompts = {
  de:"In unserem aktuellen Austausch steht noch kein Name von dir. Wie darf ich dich nennen?",
  en:"I don’t have your name in the current exchange. What would you like me to call you?",
};
export function selfIntroduction(text: string, previousAnswer?: string) {
  const input = questionAfterGreeting(text.normalize("NFKC"))
    .replace(/^(?:hi|hey|hello|hallo|servus)\s+(?=(?:my|i|i'm|i’m|mein|ich|call|nenn)\b)/iu, "")
    .replace(/^(?:(?:no|nein|actually|eigentlich|correction|korrektur)[,!: ]+)+/iu, "");
  const cue = input.match(/^(?:(my\s+(?:n\s*a\s*m\s*e|nmae|naem|nam)(?:\s+is|['’]s)|call me|you can call me|i(?:'|’)?m called|i am called)|(mein\s+n\s*a\s*m\s*e\s+ist|ich hei(?:ß|ss|s)e|nenn(?:e)? mich|du kannst mich))\s+/iu);
  const shortCue = cue ? null : input.match(/^(?:(i(?:'|’)m|i am)|(ich bin))\s+/iu);
  const match = cue || shortCue;
  const answeringName = Object.values(namePrompts).includes(previousAnswer ?? "");
  if (!match && !answeringName) return null;
  const tail = input.slice(match?.[0].length ?? 0);
  const end = tail.search(/[,!.?;]|\s+(?:and|und|but|aber)\s+/iu);
  const supplied = (end < 0 ? tail : tail.slice(0, end)).replace(/\s+nennen$/iu, "").trim();
  const words = supplied.split(/\s+/u);
  if (supplied.length > 80 || words.length > 4 || !words.every(w => /^[\p{L}\p{M}]+(?:['’‐-][\p{L}\p{M}]+)*$/u.test(w))) return null;
  // “I'm a teacher”, “Ich bin neu hier” and a quoted third person's name
  // must not silently become the visitor's identity.
  if (words.some(word => /^(?:not|nicht|kein|keine)$/iu.test(word))) return null;
  if ((shortCue || !match) && (!/^\p{Lu}/u.test(supplied) || words.some(word => /^(?:a|an|the|ein|eine|der|die|das|from|aus|at|bei|for|für|with|mit|what|who|how|where|wie|was|wer|wo|unknown|skip|teacher|student|interested|new|here|happy|ready|lost|looking|volunteer|lehrer|lehrerin|schüler|schülerin|neu|hier|interessiert|bereit|ehrenamtlich)$/iu.test(word)))) return null;
  const name = supplied === supplied.toLocaleLowerCase()
    ? supplied.replace(/(^|[\s'’‐-])\p{L}/gu, letter => letter.toLocaleUpperCase()) : supplied;
  const rest = end < 0 ? "" : tail.slice(end).replace(/^[\s,!.?;]+/u, "").replace(/^(?:and|und|but|aber)\s+/iu, "");
  return { name, rest, en: match ? !!match[1] : previousAnswer === namePrompts.en };
}
export function nameRecall(text: string) {
  return /^(?:what(?:'s| is) my name|do you (?:remember|know) my name|wie hei(?:ß|ss)e ich|wei(?:ß|ss)t du (?:noch )?wie ich hei(?:ß|ss)e|kennst du meinen namen)[?.! ]*$/iu.test(text.trim());
}
export function recentVisitorName(history: ChatMessage[]) {
  for (let i=history.length-1; i>=0; i--) {
    const turn=history[i];
    if (turn.role !== "user") continue;
    const intro = selfIntroduction(turn.content, history[i-1]?.content);
    if (intro) return intro.name;
  }
}
// Visitors often name both the wrong subject and its replacement. Indexing both
// makes yesterday's "microscope" beat today's "thermometer", even in a draft.
export function affirmedRequest(text: string) {
  const contrast = text.match(/^(?:(?:no|nein|actually|correction|korrektur|eigentlich)[\s,:.!–—-]+)*(?:(?:i|we) (?:mean|meant|need) |(?:ich|wir) (?:meine[n]?|meinte[n]?|brauche[n]?|suche[n]?) )?(?:not (?!only\b|just\b)|nicht (?!nur\b)|kein(?:e[nrms]?)? )[^.!?;]{1,100}?(?:,?\s+(?:but (?!also\b)|sondern (?!auch\b))|[.!;]\s*(?=(?:we|i|wir|ich)\b))(.+)/iu);
  if (contrast) return contrast[1].trim();
  // Also accept the reverse order in short edits. Questions and additive
  // comparisons ("not only … but also …") must keep their original meaning.
  const correction = text.replace(/^(?:(?:no|nein|actually|correction|korrektur|eigentlich)[\s,:.!–—-]+)+/iu, "");
  const reverse = correction.match(/^([^,;.!?]{1,85}?)(?:,\s*(?:not|nicht|kein(?:e[nrms]?)?)\s+|\s+(?:instead of|anstatt|statt)\s+)([^,;.!?]{1,60})[.!]?$/iu);
  if (reverse && !/^(?:only|just|nur)\b/i.test(reverse[2]) && !/\b(?:can|kann|could|should|soll|would|why|warum|wenn|if)\b/i.test(reverse[1])) return reverse[1].trim();
  return text;
}
const normalizeTurn = (text:string) => text.toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function repairRequest(text:string) {
  const s = normalizeTurn(text);
  if (/^(?:(?:no|nein) )?(?:(?:thats not|that is not|that isnt) what i (?:meant|asked)|that(?:s| is) not it|i meant something else|das (?:meinte ich nicht|habe ich nicht gemeint)|ich meinte (?:etwas|was) anderes|(?:not|kein(?:e[nrs]?)?) (?:equipment|funding|workshops?|geräte|finanzierung|messgeräte)|du hast mich falsch verstanden|you misunderstood me)$/.test(s)) return "wrong-topic";
  if (/^(?:(?:no|nein) )?(?:(?:that|this|you) (?:didnt|doesnt|did not|does not) answer my question|(?:that|this) (?:didnt help|wasnt helpful|isnt helpful)|das (?:hilft mir nicht(?: weiter)?|beantwortet meine frage nicht)|meine frage (?:war anders|wurde nicht beantwortet)|this (?:isnt|is not) helping|du verstehst mich nicht|you(?:re| are) not listening)$/.test(s)) return "not-helpful";
  return null;
}
export function wantsTeam(text:string) {
  const s=normalizeTurn(text);
  return /^(?:contact the forju team|mit forju sprechen|(?:can|could|may) i (?:please )?(?:talk|speak|chat) (?:to|with) (?:a (?:real person|human|person)|the (?:forju )?team|someone (?:at|from) forju)(?: (?:about (?:this|that)|instead|please))?|(?:ich (?:möchte|will|würde gern)|kann ich) (?:bitte )?mit (?:einem (?:echten )?menschen|jemandem(?: (?:bei|von) forju)?|dem (?:forju )?team) (?:sprechen|reden|schreiben)(?: bitte)?)$/.test(s);
}
// A school wellbeing topic does not make a request for medication a ForJu
// workshop enquiry. Decline before retrieval can turn shared words into a source.
export function unsupportedAdvice(text: string, en: boolean) {
  const q=text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  const medication=/\b(?:medicine|medication|pills?|dosage|medikament\w*|tablett\w*|dosierung)\b/.test(q);
  const personalRequest=/\b(?:which|what|recommend|should|take|give|welch\w*|empfiehl\w*|empfehl\w*|soll\w*|nehmen|einnehmen)\b/.test(q);
  if (medication && personalRequest) return en
    ? "I can help you find ForJu offers, but I can’t recommend medication. That needs a qualified medical professional."
    : "Ich helfe dir bei ForJu-Angeboten, kann aber keine Medikamente empfehlen. Dafür brauchst du medizinisches Fachpersonal.";
  return null;
}

export function conversationalReply(text: string, englishUI: boolean, preferredLanguage?:"de"|"en") {
  const kind = intent(text) ?? intent(questionAfterGreeting(text));
  if (!kind) return null;
  const en = preferredLanguage ? preferredLanguage === "en" : /\b(?:hello|thanks|thank|good|goodbye|bye|are|help|you)\b/i.test(text) ? true
    : /\b(?:hallo|servus|moin|guten|danke|dank|hilfe|du|dir|auf wiedersehen|bis bald)\b|tschüss|dankeschön|grüß/i.test(text) ? false : englishUI;
  const replies: Record<Intent,[string,string]> = {
    hello:["Hallo! 👋 Was führt dich zu ForJu? Erzähl mir gern von deiner Idee oder stell mir eine Frage.","Hi! 👋 What brings you to ForJu? Tell me about your idea or ask me a question."],
    ack:["Alles klar. Wenn noch etwas offen ist, frag gerne nach.","Got it. If anything else comes up, just ask."],
    clarify:["Welcher Teil ist unklar? Geht es um ein Wort in meiner Antwort oder darum, was du als Nächstes tun kannst?","Which part was unclear: a term I used, or what you can do next?"],
    thanks:["Gerne! Wenn du noch eine Frage hast, frag einfach.","You’re welcome! Feel free to ask if anything else comes up."],
    bye:["Bis bald! Viel Erfolg mit deinem Vorhaben.","Bye! Good luck with your project."],
    help:["Ich bin ForJu Compass. Ich kann dir zum Beispiel helfen, einen Workshop für deine Klasse zu finden oder eine Projektanfrage vorzubereiten. Was möchtest du tun?","I’m ForJu Compass. I can help you find a workshop for your class or prepare a project enquiry. What would you like to do?"],
    checkIn:["Danke der Nachfrage! Ich bin bereit. Wobei kann ich dir helfen?","Thanks for asking! I’m ready to help. What are you working on?"]
  };
  return replies[kind][en?1:0];
}
export function topicHistory(history: ChatMessage[], keepPrompt?:(answer:string)=>boolean) {
  // A polite aside is not a new subject for “How do I sign up for it?”.
  return history.flatMap((turn,i) => {
    const question = history[i-i%2].content;
    if (languageRequest(question) && !keepPrompt?.(history[i-i%2+1].content)) return [];
    const intro = selfIntroduction(question, history[i-i%2-1]?.content);
    if ((intro && !intro.rest) || nameRecall(question)) return [];
    if (intro) return [{...turn, content:turn.role === "user" ? intro.rest
      : turn.content.replace(/^(?:Nice to meet you|Thanks for the correction|Schön, dich kennenzulernen|Danke für die Korrektur), [^\n]+\n\n/u, "")}];
    return keepPrompt?.(history[i-i%2+1].content) || !conversationalReply(question,false) ? [turn] : [];
  });
}

// A language preference is a small session value, never a source or a prompt.
// Match requests to the assistant, not “English workshops” or German classes.
export function languageRequest(text:string):"de"|"en"|undefined {
  const s=text.toLowerCase().replace(/[?.!,]/g," ").replace(/\s+/g," ").trim();
  const match=s.match(/^(?:(?:(?:could|can|would) you )?(?:please )?(?:answer|reply|respond|continue|speak)(?: to me)? in |(?:bitte )?(?:(?:kannst|könntest) du )?(?:auf )?)(german|deutsch|english|englisch)(?: (?:antworten|weitermachen|sprechen))?(?: please| bitte)?$/);
  return match ? /^(german|deutsch)$/.test(match[1]) ? "de" : "en" : undefined;
}
export function languageReplay(history:ChatMessage[], keepPrompt?:(answer:string)=>boolean) {
  for(let i=history.length-2;i>=0;i-=2) {
    const question=history[i].content;
    if(languageRequest(question) || (conversationalReply(question,false) && !keepPrompt?.(history[i+1].content))) continue;
    return {message:question,history:history.slice(0,i)};
  }
  return null;
}
