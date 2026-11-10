import {assistantAvailability} from "@/lib/server/assistant";
import {projectMailConfig} from "@/lib/server/project-submission";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// No external calls. Liveness stays distinct from provider readiness so an
// exhausted allowance cannot cause the host to restart and reset its ledger.
export function GET(){
  const assistant=assistantAvailability();
  return Response.json({status:assistant.state==="budget-unavailable"?"unhealthy":"alive",assistant,
    projectDelivery:projectMailConfig()?"configured-not-verified":"unavailable"},
    {status:assistant.state==="budget-unavailable"?503:200,headers:{"Cache-Control":"no-store"}});
}
