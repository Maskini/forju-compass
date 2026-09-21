import { z } from "zod";

export const feedbackTypes = ["incorrect_answer", "technical_problem", "outdated_information", "other"] as const;
export type FeedbackType = typeof feedbackTypes[number];
const singleLine = (max: number) => z.string().trim().max(max).refine(value => !/[\r\n\u0000-\u001f\u007f]/.test(value));
export const feedbackFieldsSchema = z.object({
  type: z.enum(feedbackTypes),
  description: z.string().trim().min(10).max(1000).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)),
  email: z.union([singleLine(254).pipe(z.email()), z.literal("")]).optional(),
});
export const feedbackSchema = feedbackFieldsSchema.extend({
  pageUrl: singleLine(2048).pipe(z.url()).refine(value => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }).optional(),
  pathname: singleLine(1024).refine(value => value.startsWith("/")).optional(),
  pageTitle: singleLine(200).optional(),
  timestamp: z.string().trim().max(40).pipe(z.iso.datetime({ offset: true })),
  userAgent: singleLine(512).optional(),
  language: z.enum(["de", "en", "DE", "EN"]).optional(),
  viewportWidth: z.number().int().min(1).max(20000).optional(),
  viewportHeight: z.number().int().min(1).max(20000).optional(),
  conversationId: singleLine(128).optional(),
  sessionId: singleLine(128).optional(),
  honeypot: z.string().trim().max(200).optional(),
}).strict();
export type FeedbackReport = z.infer<typeof feedbackSchema>;

// Never retain URL credentials, query values or fragments in a report.
export function feedbackPageUrl(value: string) {
  const url = new URL(value);
  url.username = ""; url.password = ""; url.search = ""; url.hash = "";
  return url.href;
}
