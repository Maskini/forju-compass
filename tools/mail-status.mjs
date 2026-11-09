// Operator-only, read-only lookup. No endpoint exposes delivery records publicly.
import {pathToFileURL} from 'node:url';

export class MailStatusError extends Error {}
export async function mailStatus(id,key,request=fetch) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw new MailStatusError('Use the providerId from a [compass-mail] server log entry.');
  if(!key?.trim())throw new MailStatusError('RESEND_API_KEY is missing. Load the existing private environment file; do not paste a key into this command.');
  const response=await request('https://api.resend.com/emails/'+id,{
    method:'GET',headers:{Authorization:'Bearer '+key.trim()},redirect:'error',signal:AbortSignal.timeout(15000),
  });
  if([401,403].includes(response.status))throw new MailStatusError('This key cannot read delivery status. Find the providerId in the signed-in Resend Emails dashboard. Sending-only keys are sufficient for Compass; do not broaden the production key.');
  if(response.status===404)throw new MailStatusError('No message found for this ID in this account. Check the providerId in Resend.');
  if(!response.ok)throw new MailStatusError('Delivery lookup failed (HTTP '+response.status+'). Retry later or check the Resend Emails dashboard.');
  const data=await response.json();
  const known=['sent','delivered','delivery_delayed','bounced','complained','opened','clicked','scheduled','failed','suppressed','queued'];
  const state=known.includes(data.last_event)?data.last_event:'unknown';
  return {providerId:id,state,note:state==='delivered'
    ? 'The recipient mail server accepted the message. Inbox placement still needs checking.'
    : state==='bounced'||state==='failed'||state==='suppressed'
      ? 'Delivery did not succeed. Check this message in Resend before retrying.'
      : 'This status does not confirm inbox receipt. Inspect the delivery events in Resend.'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{console.log(JSON.stringify(await mailStatus(process.argv[2],process.env.RESEND_API_KEY),null,2));}
  catch(error){console.error(error instanceof MailStatusError?error.message:'Delivery lookup was unavailable. Retry later.');process.exitCode=1;}
}
