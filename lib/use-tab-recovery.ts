"use client";
import {useCallback,useEffect,useRef,useState,type SetStateAction} from "react";
import type {z} from "zod";
import {readRecovery,recoveryKey,writeRecovery,type StorageLike} from "./tab-recovery";

function storage():StorageLike|undefined {try{return window.sessionStorage}catch{return undefined}}
export function useTabRecovery<T>(name:"chat"|"project",schema:z.ZodType<T>,initial:T,restore?:(saved:T)=>T) {
  const [value,render]=useState(initial),[restored,setRestored]=useState(false);
  const current=useRef(initial),key=useRef(""),active=useRef(false);
  useEffect(()=>{
    active.current=true;
    key.current=recoveryKey(name,window.location.pathname);
    const saved=readRecovery(storage(),key.current,schema);
    if(saved!==undefined)current.current=restore?restore(saved):saved;
    // Browser storage can only be read after hydration, never in server HTML.
    render(current.current);setRestored(true);
    const purge=setInterval(()=>{readRecovery(storage(),key.current,schema)},60_000);
    return ()=>{active.current=false;clearInterval(purge)};
  },[name,schema,restore]);
  const setValue=useCallback((update:SetStateAction<T>)=>{
    // A late send response must not resurrect a form removed with the trash.
    if(!active.current)return;
    const next=typeof update==="function"?(update as (previous:T)=>T)(current.current):update;
    current.current=next;
    // Write synchronously before an explicit send, so a reload cannot lose its
    // idempotency key. Merely mounting/restoring does not extend the expiry.
    if(key.current)writeRecovery(storage(),key.current,schema,next);
    render(next);
  },[schema]);
  return [value,setValue,restored] as const;
}
