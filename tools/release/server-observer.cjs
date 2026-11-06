// OS isolation is the enforcement boundary. This also records attempted HTTP egress.
const dc=require('node:diagnostics_channel'),fs=require('node:fs');
function inspect(host){
 if(!host||['127.0.0.1','localhost','::1','[::1]'].includes(host))return;
 fs.appendFileSync('/out/server-egress.jsonl',JSON.stringify({host})+'\n');
}
dc.channel('undici:request:create').subscribe(({request})=>inspect(new URL(request.origin).hostname));
dc.channel('http.client.request.start').subscribe(({request})=>inspect(request.host?.split(':')[0]));
