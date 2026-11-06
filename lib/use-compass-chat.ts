"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import {MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, safeSourceUrl, type ChatMessage, type Source} from "@/lib/chat";
// Static HTML can arrive well before React attaches the submit handler.
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function useCompassChat(language:"en"|"de") {
  const ready = useSyncExternalStore(subscribe,clientReady,serverReady);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const [turns, setTurns] = useState<{ question: string; answer: string; sources: Source[]; draft: boolean; recipient?:string; suggestions:string[]; topic?:string; answeredAt:number }[]>([]);
  const inFlight = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const latestSources = !loading && !error ? (turns.at(-1)?.sources ?? []) : [];

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [turns, loading, error]);

  async function submit(value?: string, replyLanguage: "de"|"en" = language) {
    const next = (value ?? question).trim();

    if (!next || inFlight.current || next.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    inFlight.current = true;
    setSubmittedQuestion(next);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", "Accept-Language":replyLanguage,
        },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          message: next, topic: turns.at(-1)?.topic,
          history: turns.slice(-MAX_HISTORY_MESSAGES / 2).flatMap((turn): ChatMessage[] => [
            { role: "user", content: turn.question },
            { role: "assistant", content: turn.answer.slice(0, 4000) },
          ]),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Die Anfrage konnte nicht verarbeitet werden."
        );
      }

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("Die Antwort war leer. Bitte versuche es erneut.");
      }
      const sources: Source[] = Array.isArray(data.sources) ? data.sources.filter(
        (source: Source) => source && typeof source.title === "string" && safeSourceUrl(source.url)
      ) : [];
      const suggestions:string[] = Array.isArray(data.suggestions)
        ? data.suggestions.filter((s:unknown)=>typeof s==="string" && s.length>0 && s.length<80).slice(0,4) : [];
      setTurns((previous) => [...previous, { question: next, answer: data.answer, sources, suggestions, topic:typeof data.topic==="string"?data.topic:undefined, draft:data.mode === "draft", recipient: typeof data.recipient==="string" && /^[\w.+-]+@forju\.at$/i.test(data.recipient) ? data.recipient : undefined, answeredAt:Date.now() }]);
      setSubmittedQuestion("");
    } catch (err) {


      setQuestion(next);
      setError(err instanceof Error && err.name === "TimeoutError"
        ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
        : err instanceof Error ? err.message : "Die Anfrage konnte nicht verarbeitet werden.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return {ready,question,setQuestion,submittedQuestion,turns,transcript,loading,error,latestSources,submit,setTurns,setSubmittedQuestion,setError};
}
