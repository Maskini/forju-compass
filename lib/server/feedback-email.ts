import "server-only";
import { Resend } from "resend";
import { z } from "zod";
import { feedbackPageUrl, type FeedbackReport } from "../feedback-validation";

const labels = { incorrect_answer: "Falsche Antwort", technical_problem: "Technisches Problem", outdated_information: "Veraltete Information", other: "Sonstiges" };
export class FeedbackConfigurationError extends Error {}
export class FeedbackDeliveryError extends Error {}
export function feedbackEmailConfig(env = process.env) {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.FEEDBACK_FROM_EMAIL?.trim();
  const to = env.FEEDBACK_TO_EMAIL?.trim();
  const localTest = (env.NODE_ENV === "development" && env.FEEDBACK_LOCAL_TEST === "true") || env.FEEDBACK_DEMO_MODE === "true";
  const validRecipient = localTest
    ? to === "adam.maskini@icloud.com" && from === "onboarding@resend.dev"
    : to === "adam.maskini@forju.at";
  if (!key || !from || !to || !z.email().safeParse(from).success || !validRecipient) {
    throw new FeedbackConfigurationError("Configure RESEND_API_KEY, FEEDBACK_FROM_EMAIL (verified sender) and FEEDBACK_TO_EMAIL in the server environment.");
  }
  return { key, from, to };
}
export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export function feedbackEmail(report: FeedbackReport) {
  const rows: [string, string][] = [
    ["Art des Problems", labels[report.type]], ["Beschreibung", report.description],
    ["Kontakt-E-Mail", report.email || "Nicht angegeben"],
    ["Seite", report.pageUrl ? feedbackPageUrl(report.pageUrl) : "Nicht angegeben"],
    ["Pfad", report.pathname?.split(/[?#]/)[0] || "Nicht angegeben"],
    ["Seitentitel", report.pageTitle || "Nicht angegeben"], ["Zeitpunkt", report.timestamp],
    ["Sprache", report.language?.toUpperCase() || "Nicht angegeben"],
    ["Browser", report.userAgent || "Nicht angegeben"],
    ["Viewport", `${report.viewportWidth ?? "?"} × ${report.viewportHeight ?? "?"}`],
    ...(report.conversationId ? [["Conversation ID", report.conversationId] as [string, string]] : []),
    ...(report.sessionId ? [["Session ID", report.sessionId] as [string, string]] : []),
  ];
  return {
    subject: `[ForJu Compass] ${labels[report.type]}`,
    text: `ForJu Compass\nNeue Rückmeldung\n\n${rows.map(([label, value]) => `${label}:\n${value}`).join("\n\n")}`,
    html: `<!doctype html><html lang="de"><body style="margin:0;background:#fffdfb;font-family:Arial,sans-serif;color:#2d1e1e"><main style="max-width:640px;margin:24px auto;padding:28px;border:1px solid #eadedc;border-radius:20px"><p style="color:#861456;font-weight:bold">ForJu Compass</p><h1 style="font-size:24px">Neue Rückmeldung</h1>${rows.map(([label, value]) => `<h2 style="font-size:14px;margin:24px 0 6px;color:#6b5a5a">${escapeEmailHtml(label)}</h2><p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${escapeEmailHtml(value)}</p>`).join("")}</main></body></html>`,
  };
}
export async function sendFeedbackEmail(report: FeedbackReport, idempotencyKey: string) {
  const config = feedbackEmailConfig();
  const resend = new Resend(config.key);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      resend.emails.send({ from: config.from, to: [config.to], ...(report.email ? { replyTo: report.email } : {}), ...feedbackEmail(report) }, { idempotencyKey }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new FeedbackDeliveryError("provider_timeout")), 15000); }),
    ]);
    if (result.error || !result.data?.id) throw new FeedbackDeliveryError("provider_rejected");
    return result.data.id;
  } finally { if (timer) clearTimeout(timer); }
}
