"use client";

import {useEffect, useRef, useState} from "react";
import {PROJECT_MAX_LENGTH} from "@/lib/project-mail";

type Availability = "unknown" | "available" | "unavailable";
type Receipt = {identity: string; state: "accepted" | "error"};

// Lives with the draft, so going back a step or returning to chat keeps the
// reply address and receipt. Only an explicit press of Send can post a draft.
export function useProjectDelivery(review: boolean, lang: "de" | "en", message: string) {
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [reply, setReply] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const key = useRef("");
  const replyEmail = reply.trim();
  const validReply = !replyEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail);
  const identity = JSON.stringify([lang, message, replyEmail]);
  const result = receipt?.identity === identity ? receipt.state : null;
  const tooLong = message.length > PROJECT_MAX_LENGTH;
  const canSend = Boolean(message) && validReply && !tooLong && !busy && result !== "accepted" && availability !== "unavailable";

  useEffect(() => {
    if (!review) return;
    const ctrl = new AbortController();
    fetch("/api/project-submission", {cache:"no-store", signal:ctrl.signal})
      .then(async r => r.ok ? (await r.json()).direct : undefined)
      .then(configured => {
        if (!ctrl.signal.aborted && typeof configured === "boolean") setAvailability(configured ? "available" : "unavailable");
      }).catch(() => {}); // The POST can still work when a status check fails.
    return () => ctrl.abort();
  }, [review]);

  async function send() {
    if (lock.current || !canSend) return;
    lock.current = true;
    setBusy(true);
    setReceipt(null);
    try {
      // The endpoint also includes a payload digest in its provider key.
      key.current ||= crypto.randomUUID();
      const response = await fetch("/api/project-submission", {
        method:"POST", headers:{"Content-Type":"application/json", "Idempotency-Key":key.current},
        body:JSON.stringify({draft:message, language:lang, confirmed:true, ...(replyEmail ? {replyEmail} : {})}),
        signal:AbortSignal.timeout(20000),
      });
      if (response.status === 503) setAvailability("unavailable");
      if (!response.ok || (await response.json()).accepted !== true) throw Error();
      setReceipt({identity, state:"accepted"});
    } catch {
      setReceipt({identity, state:"error"});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {availability, reply, setReply, validReply, result, busy, canSend, send, tooLong};
}
