"use client";
import { useSyncExternalStore } from "react";
export type AppLanguage = "de" | "en";
let sessionLanguage: AppLanguage = "de";
function getLanguage(): AppLanguage {
  try { const saved = localStorage.getItem("forju-language"); if (saved === "en" || saved === "de") return saved; } catch { /* In-memory fallback. */ }
  return sessionLanguage;
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("forju-language-change", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("forju-language-change", listener); };
}
export function useAppLanguage() { return useSyncExternalStore(subscribe, getLanguage, () => "de" as const); }
export function setAppLanguage(next: AppLanguage) {
  sessionLanguage = next;
  try { localStorage.setItem("forju-language", next); } catch { /* In-memory fallback. */ }
  window.dispatchEvent(new Event("forju-language-change"));
}
