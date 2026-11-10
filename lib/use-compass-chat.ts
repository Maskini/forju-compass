"use client";
import {useEffect,useRef,useState} from "react";
import {MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, safeSourceUrl, type ChatMessage, type Source} from "@/lib/chat";
import {chatRecoverySchema,clearRecovery,type ChatRecovery} from "./tab-recovery";
import {useTabRecovery} from "./use-tab-recovery";
const restoreChat=(saved:ChatRecovery)=>({...saved,question:saved.question || saved.pending,pending:""});
export function useCompassChat(language:"en"|"de") {
  const [saved,setSaved,ready]=useTabRecovery<ChatRecovery>("chat",chatRecoverySchema,{question:"",pending:"",turns:[],uiLanguage:language},restoreChat);
  const {turns}=saved;
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [conversationId, setConversationId] = useState(0);
  const setQuestion=(question:string)=>setSaved(previous=>({...previous,question}));
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const latestSources = !loading && !error ? (turns.at(-1)?.sources ?? []) : [];

  useEffect(() => () => {
    requestVersion.current++;
    requestController.current?.abort();
  }, []);

  function clearConversation() {
    requestVersion.current++;
    requestController.current?.abort();
    requestController.current = null;
    inFlight.current = false;
    setSaved({question:"",pending:"",turns:[],uiLanguage:language});
    try{clearRecovery(window.sessionStorage,window.location.pathname)}catch{}
    setSubmittedQuestion(""); setError(""); setLoading(false);
    setConversationId(id => id + 1);
    transcript.current?.scrollTo(0, 0);
  }

  useEffect(() => {
    const log = transcript.current;
    if (!log) return;
    const latest = !loading && !error && log.dataset.readLatest === "start"
      ? log.querySelector("[role=log] article:last-child") : null;
    if (latest) {
      // Start reading at the new exchange without scrolling the host document.
      log.scrollTop += latest.getBoundingClientRect().top - log.getBoundingClientRect().top - 12;
    } else if (turns.length || loading || error) {
      log.scrollTop = log.scrollHeight;
    }
  }, [turns, loading, error]);

  async function submit(value?: string, replyLanguage: "de"|"en" = language) {
    const next = (value ?? saved.question).trim();

    if (!ready || !next || inFlight.current || next.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    const preferredLanguage=saved.uiLanguage===replyLanguage?saved.preferredLanguage:undefined;
    inFlight.current = true;
    const version = ++requestVersion.current;
    const controller = new AbortController();
    requestController.current = controller;
    setSubmittedQuestion(next);
    setSaved(previous=>({...previous,question:"",pending:next,uiLanguage:replyLanguage,preferredLanguage}));
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", "Accept-Language":replyLanguage,
        },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
        body: JSON.stringify({
          message: next, topic: turns.at(-1)?.topic, preferredLanguage, visitorName:saved.visitorName,
          history: turns.slice(-MAX_HISTORY_MESSAGES / 2).flatMap((turn): ChatMessage[] => [
            { role: "user", content: turn.question },
            { role: "assistant", content: turn.answer.slice(0, 4000) },
          ]),
        }),
      });

      const data = await response.json();
      if (version !== requestVersion.current) return;

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
      setSaved(previous => ({...previous, pending:"",
        visitorName:typeof data.visitorName === "string" && data.visitorName.length <= 80 ? data.visitorName : previous.visitorName,
        preferredLanguage:data.preferredLanguage === "de" || data.preferredLanguage === "en" ? data.preferredLanguage : previous.preferredLanguage,
        turns:[...previous.turns, { question: next, answer: data.answer, sources, suggestions, limited:data.limited===true, topic:typeof data.topic==="string"?data.topic:undefined, draft:data.mode === "draft", recipient: typeof data.recipient==="string" && /^[\w.+-]+@forju\.at$/i.test(data.recipient) ? data.recipient : undefined, answeredAt:Date.now() }].slice(-30)}));
      setSubmittedQuestion("");
    } catch (err) {
      if (version !== requestVersion.current) return;
      setSaved(previous=>({...previous,question:previous.question || next,pending:""}));
      setError(err instanceof Error && err.name === "TimeoutError"
        ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
        : err instanceof Error ? err.message : "Die Anfrage konnte nicht verarbeitet werden.");
    } finally {
      if (version === requestVersion.current) {
        inFlight.current = false;
        requestController.current = null;
        setLoading(false);
      }
    }
  }

  return {ready,question:saved.question,setQuestion,submittedQuestion,turns,transcript,loading,error,latestSources,submit,conversationId,clearConversation};
}
