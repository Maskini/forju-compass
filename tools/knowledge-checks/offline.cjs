// Evaluation process only. Fail rather than send a visitor fixture off this laptop.
const dc=require('node:diagnostics_channel');
function allowed(host){ if(!['127.0.0.1','localhost','::1','[::1]'].includes(host)) throw Error('Blocked non-local evaluation request'); }
dc.channel('undici:request:create').subscribe(({request})=>allowed(new URL(request.origin).hostname));
dc.channel('http.client.request.start').subscribe(({request})=>allowed(request.host?.split(':')[0]));
