"use client";

import {useEffect, useRef, useState} from "react";
import type {ProjectRecovery} from "@/lib/tab-recovery";
import {PROJECT_MAX_LENGTH} from "@/lib/project-mail";

async function checkSender(signal: AbortSignal) {
  const response = await fetch("/api/project-submission", {cache:"no-store", signal});
  if (!response.ok) throw new Error("Could not check sending availability");
  return (await response.json()).direct === true;
}
type Delivery=ProjectRecovery["delivery"];

// Lives with the draft, so going back a step or returning to chat keeps the
// reply address and receipt. Only an explicit press of Send can post a draft.
export function useProjectDelivery(started: boolean, lang: "de" | "en", message: string, saved:Delivery, save:(update:(previous:Delivery)=>Delivery)=>void) {
  const [unavailable, setUnavailable] = useState(false);
  const {reply,receipt}=saved;
  const setReply=(reply:string)=>save(s=>({...s,reply}));
  const setReceipt=(receipt:Delivery["receipt"])=>save(s=>({...s,receipt}));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const replyEmail = reply.trim();
  const validReply = !replyEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail);
  const identity = JSON.stringify([lang, message, replyEmail]);
  const result = receipt?.identity === identity ? receipt.state : null;
  const tooLong = message.length > PROJECT_MAX_LENGTH;
  const canSend = Boolean(message) && validReply && !tooLong && !busy && result !== "accepted";

  useEffect(() => {
    if (!started) return;
    const ctrl = new AbortController();
    checkSender(ctrl.signal).then(ready => {
      if (!ctrl.signal.aborted) setUnavailable(!ready);
    }).catch(() => {}); // The submission endpoint can still work if this check fails.
    return () => ctrl.abort();
  }, [started]);

  async function send() {
    if (lock.current || !canSend) return;
    lock.current = true;
    setBusy(true);
    setReceipt(null);
    try {
      if (unavailable) {
        // Recheck before transmitting any draft data to a known offline sender.
        const ready = await checkSender(AbortSignal.timeout(10000));
        if (!ready) {
          setReceipt({identity, state:"unavailable"});
          return;
        }
        setUnavailable(false);
      }
      // The endpoint also includes a payload digest in its provider key.
      const key=saved.key || crypto.randomUUID();
      save(s=>({...s,key}));
      const response = await fetch("/api/project-submission", {
        method:"POST", headers:{"Content-Type":"application/json", "Idempotency-Key":key},
        body:JSON.stringify({draft:message, language:lang, confirmed:true, ...(replyEmail ? {replyEmail} : {})}),
        signal:AbortSignal.timeout(20000),
      });
      if (response.status === 503) {
        setUnavailable(true);
        setReceipt({identity, state:"unavailable"});
        return;
      }
      if (!response.ok || (await response.json()).accepted !== true) throw Error();
      setReceipt({identity, state:"accepted"});
    } catch {
      setReceipt({identity, state:"error"});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {unavailable, reply, setReply, validReply, result, busy, canSend, send, tooLong};
}
