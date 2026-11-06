"use client";
import {useEffect,useRef,useState} from "react";
import {MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, safeSourceUrl, type ChatMessage, type Source} from "@/lib/chat";
export function useCompassChat(language:"en"|"de") {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const [turns, setTurns] = useState<{ question: string; answer: string; sources: Source[]; library: boolean; answeredAt:number }[]>([]);
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
          message: next,
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
      setTurns((previous) => [...previous, { question: next, answer: data.answer, sources, library:data.mode === "library",answeredAt:Date.now() }]);
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

  return {question,setQuestion,submittedQuestion,turns,transcript,loading,error,latestSources,submit,setTurns,setSubmittedQuestion,setError};
}
