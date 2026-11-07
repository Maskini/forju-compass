import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const root=resolve(import.meta.dirname,'../..'), phase=process.argv[2]||'after';
if(!['before','after','holdout'].includes(phase))throw Error('Use before, after or holdout');
const out=resolve(process.argv[3]||join(root,'work/knowledge-release',phase+'.json'));
const casesPath=process.env.COMPASS_EVAL_CASES ? resolve(process.env.COMPASS_EVAL_CASES) : join(import.meta.dirname,'release-cases.json');
const cases=JSON.parse(readFileSync(casesPath)).filter(c=>phase==='holdout'?c.holdout:!c.holdout);
const scratch=mkdtempSync(join(tmpdir(),'compass-eval-')), quota=join(scratch,'quota.sqlite');
const started=performance.now(),samples=[],latencies=[],results=[];let readyMs;
const server=spawn(process.execPath,['--require',join(import.meta.dirname,'offline.cjs'),'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4327'],{cwd:root,
 env:{...process.env,COMPASS_LOCAL_ONLY:'true',OPENAI_API_KEY:'',RESEND_API_KEY:'',SUPABASE_SECRET_KEY:'',SUPABASE_URL:'',COMPASS_CLIENT_IP_HEADER:'',NEXT_TELEMETRY_DISABLED:'1',COMPASS_QUOTA_DB:quota},stdio:['ignore','ignore','pipe']});
server.stderr.on('data',()=>{});
function sample(){try{samples.push(Number(execFileSync('ps',['-o','rss=','-p',String(server.pid)],{encoding:'utf8'}).trim())*1024)}catch{}}
const timer=setInterval(sample,100);
try{
 let ready=false;
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Production process exited');try{if((await fetch('http://127.0.0.1:4327/embed')).ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,100))}
 if(!ready)throw Error('Production startup timed out');readyMs=performance.now()-started;
 for(const c of cases){
  // Independent synthetic trial; reset only this disposable database. k6 tests real limits separately.
  if(results.length){const db=new DatabaseSync(quota);try{db.exec('DELETE FROM counts')}finally{db.close()}}
  const history=[],answers=[];let topic,preferredLanguage;
  for(const message of c.turns){
   const start=performance.now();const res=await fetch('http://127.0.0.1:4327/api/chat',{method:'POST',headers:{'content-type':'application/json','accept-language':c.lang},body:JSON.stringify({message,history:history.slice(-8),topic,preferredLanguage}),signal:AbortSignal.timeout(15000)});
   latencies.push(performance.now()-start);if(!res.ok)throw Error('Unexpected HTTP '+res.status);
   const a=await res.json();answers.push(a);topic=a.topic;preferredLanguage=a.preferredLanguage;history.push({role:'user',content:message},{role:'assistant',content:a.answer});sample();
  }
  const a=answers.at(-1),sources=a.sources||[],url=c.source?'https://forju.at/'+(c.sourceLanguage||c.lang)+'/'+c.source:null;
  const checks={topic:(a.topic??null)===c.topic,source:url?sources.some(s=>s.url===url):sources.length===0,facts:c.facts.every(p=>new RegExp(p,'iu').test(a.answer)),noFabrication:!(c.forbid||[]).some(p=>new RegExp(p,'iu').test(a.answer))};
  results.push({...c,answers,checks,pass:Object.values(checks).every(Boolean)});
 }
 const ordered=[...latencies].sort((a,b)=>a-b);
 const report={phase,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),catalogSha256:createHash('sha256').update(readFileSync(join(root,'knowledge/catalog.json'))).digest('hex'),mode:'production local-only; synthetic; loopback only; independent quota per scenario',startupMs:Math.round(readyMs),peakRssBytes:Math.max(...samples),catalogBytes:readFileSync(join(root,'knowledge/catalog.json')).length,requests:latencies.length,p95Ms:ordered[Math.ceil(ordered.length*.95)-1],passed:results.filter(r=>r.pass).length,total:results.length,results};
 mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 if(report.passed!==report.total)process.exitCode=1;
 console.log(JSON.stringify({...report,results:results.map(r=>({id:r.id,pass:r.pass,checks:r.checks}))},null,2));
}finally{clearInterval(timer);if(server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}rmSync(scratch,{recursive:true,force:true})}
