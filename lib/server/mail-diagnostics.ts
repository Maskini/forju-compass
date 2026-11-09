import "server-only";

// Operational metadata only. Never pass a payload, address, provider error or
// credential here. IDs let the operator find the message in the existing Resend
// dashboard; acceptance is not a claim about inbox delivery.
export function recordMailAcceptance(kind:"feedback"|"project", providerId:string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId)) return;
  console.info("[compass-mail]",JSON.stringify({kind,state:"accepted",providerId,at:new Date().toISOString()}));
}
