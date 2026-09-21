import { createFeedbackHandler } from "@/lib/server/feedback-handler";
import { sendFeedbackEmail } from "@/lib/server/feedback-email";
import { feedbackClientKey, limitFeedback } from "@/lib/server/feedback-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;
export const POST = createFeedbackHandler({
  send: sendFeedbackEmail,
  limit: request => limitFeedback(feedbackClientKey(request)),
  log: (event, requestId) => {
    // Never log report bodies, email addresses, IPs, API keys, or provider messages.
    if (event !== "accepted") console.error(`[feedback] ${event}`, { requestId });
    if (event === "configuration_missing" && process.env.NODE_ENV !== "production") {
      console.error("[feedback] Set RESEND_API_KEY, FEEDBACK_TO_EMAIL and a verified FEEDBACK_FROM_EMAIL in .env.local.");
    }
  },
});
