import {createProjectHandler,deliverProject,projectMailConfig} from "@/lib/server/project-submission";
import {createFeedbackLimiter,feedbackClientKey} from "@/lib/server/feedback-rate-limit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const limit=createFeedbackLimiter();
export const POST=createProjectHandler({config:projectMailConfig,deliver:deliverProject,limit:req=>limit(feedbackClientKey(req))});
export function GET(){return Response.json({direct:Boolean(projectMailConfig())},{headers:{"Cache-Control":"no-store"}})}
