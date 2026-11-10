import http from 'k6/http';
import {sleep, check, fail} from 'k6';
import {Counter, Trend} from 'k6/metrics';
const status200=new Counter('accepted'), limited=new Counter('expected_429'), unexpected=new Counter('unexpected_errors');
const normal=new Trend('normal_ms',true), burst=new Trend('burst_ms',true);
const burstAccepted=new Trend('burst_accepted_ms',true), burstLimited=new Trend('burst_limited_ms',true), recovery=new Trend('recovery_ms',true);
export const options={vus:1,iterations:1,batchPerHost:12,summaryTrendStats:['avg','max','p(95)'],thresholds:{checks:['rate==1'],unexpected_errors:['count==0'],expected_429:['count>0'],normal_ms:['p(95)<1500'],burst_ms:['p(95)<2500']}};
http.setResponseCallback(http.expectedStatuses(200,429));
const url='http://127.0.0.1:4196/api/chat', body=JSON.stringify({message:'Welche Workshops gibt es für Schulen?'});
const params=i=>({headers:{'Content-Type':'application/json','X-Audit-Client':'192.0.2.'+i}});
function record(r,t){t.add(r.timings.duration);if(r.status===200)status200.add(1);else if(r.status===429)limited.add(1);else unexpected.add(1);}
export default function(){
  unexpected.add(0);
  // Leave sufficient time in this fixed window even on a slow machine.
  const probe=http.get('http://127.0.0.1:4196/api/health');
  const serverDate=Date.parse(probe.headers.Date);
  if(!Number.isFinite(serverDate))fail('Server Date header needed to align the rate-limit window');
  const sec=new Date(serverDate).getUTCSeconds();if(sec>40)sleep(62-sec);
  console.info('quota window check',JSON.stringify({client:new Date().toISOString(),server:probe.headers.Date}));
  for(let i=1;i<=5;i++){const r=http.post(url,body,params(1));record(r,normal);check(r,{'normal answers accepted':r=>r.status===200&&!!r.json('answer')});sleep(.7)}
  const perVisitor=http.post(url,body,params(1));
  console.info('sixth request',JSON.stringify({status:perVisitor.status,server:perVisitor.headers.Date}));
  check(perVisitor,{'identified visitor limited before shared capacity is full':r=>r.status===429});
  if(perVisitor.status===429)limited.add(1);else unexpected.add(1);
  const batch=http.batch(Array.from({length:20},(_,i)=>['POST',url,body,params(i+2)]));
  for(const r of batch){record(r,burst);if(r.status===200)burstAccepted.add(r.timings.duration);else if(r.status===429)burstLimited.add(r.timings.duration)}
  check(batch,{'burst: seven remaining global slots':rs=>rs.filter(r=>r.status===200).length===7,'burst: thirteen expected limits':rs=>rs.filter(r=>r.status===429).length===13});
  const retry=Number(batch.find(r=>r.status===429)?.headers['Retry-After']);
  if(!check(retry,{'bounded Retry-After':n=>n>0&&n<=60}))fail('No valid reset time');
  sleep(retry+1);const r=http.post(url,body,params(1));record(r,recovery);check(r,{'recovery after real window reset':r=>r.status===200&&!!r.json('answer')});
}
