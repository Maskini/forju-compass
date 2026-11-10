// Read-only deployment check. Does not ask a question or send email.
const base=new URL(process.env.COMPASS_CHECK_URL||'http://127.0.0.1:4197');
if(base.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use HTTPS for a remote service');
const start=performance.now();
try{
 const response=await fetch(new URL('/api/health',base),{signal:AbortSignal.timeout(65000)});
 const value=await response.json(),issues=[];
 if(!response.ok||value.status!=='alive')issues.push('Application storage/liveness failed');
 if(process.argv.includes('--require-ai')&&(!value.assistant?.providerVerified||value.assistant.state!=='available'))issues.push('AI readiness has not passed: '+(value.assistant?.state||'unknown'));
 if(process.argv.includes('--require-mail')&&value.projectDelivery!=='configured-not-verified')issues.push('Project email is not configured');
 console.log(JSON.stringify({url:base.origin,ms:Math.round(performance.now()-start),...value,issues,note:'Configuration and recent provider state only; this does not verify inbox delivery.'},null,2));
 if(issues.length)process.exitCode=1;
}catch(error){console.error('Readiness check failed:',error.name);process.exitCode=1}
