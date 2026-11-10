// Explicit opt-in: synthetic messages, localhost only, at most eight paid calls.
// The caller starts the production app in AI mode with an isolated quota DB.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
if(!process.argv.includes('--live'))throw Error('Live OpenAI verification is opt-in: pass --live. It may use API credits.');
const base=new URL(process.env.COMPASS_AI_TEST_URL||'http://127.0.0.1:4197');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.protocol!=='http:')throw Error('Use an isolated loopback app, never the public deployment.');
const holdout=process.argv.includes('--holdout');
const cases=JSON.parse(readFileSync(new URL(holdout?'./holdout.json':'./cases.json',import.meta.url),'utf8'));
const results=[];let stopped=false;
for(const scenario of cases){
 const history=[];let topic,preferredLanguage,visitorName;
 for(const turn of scenario.turns){
  const start=performance.now();
  const response=await fetch(new URL('/api/chat',base),{method:'POST',headers:{'content-type':'application/json','accept-language':scenario.language},body:JSON.stringify({message:turn.question,history:history.slice(-8),topic,preferredLanguage,visitorName}),signal:AbortSignal.timeout(25000)});
  const value=await response.json();const mode=response.headers.get('x-compass-answer-mode');
  const failures=[];
  if(response.status!==200||mode!=='openai')failures.push('Not an actual OpenAI answer: '+response.status+' '+(response.headers.get('x-compass-fallback')||mode));
  else{
   if(/\uE200|\uE201|\[(?:interne?|internal|Evidence|Evidenz|Quelle|Source)\b|\[(?:fact|conversation|guidance|unknown)\]/i.test(value.answer))failures.push('Internal citation label leaked into the answer');
   for(const pattern of turn.required||[])if(!new RegExp(pattern,'iu').test(value.answer))failures.push('Missing expected fact: '+pattern);
   for(const pattern of turn.forbidden||[])if(new RegExp(pattern,'iu').test(value.answer))failures.push('Unsafe claim: '+pattern);
   if(turn.source&&!value.sources.some(s=>s.url===`https://forju.at/${scenario.language}${turn.source}`))failures.push('Missing supporting page: '+turn.source);
  }
  results.push({scenario:scenario.id,question:turn.question,answer:value.answer,sources:value.sources,status:response.status,mode,ms:Math.round(performance.now()-start),failures,humanReview:'Check that each claim is supported and the conversation feels useful.'});
  if(mode!=='openai'){stopped=true;break;}
  topic=value.topic;preferredLanguage=value.preferredLanguage;visitorName=value.visitorName;
  history.push({role:'user',content:turn.question},{role:'assistant',content:value.answer});
 }
 if(stopped)break;
}
const path=resolve('work/assistant-checks/'+(holdout?'holdout':'live')+'.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify({at:new Date().toISOString(),kind:'live OpenAI via local production app',results},null,2)+'\n');
console.log(JSON.stringify({evidence:path,answers:results.length,failed:results.filter(r=>r.failures.length).length,stopped}));
if(results.some(r=>r.failures.length))process.exitCode=1;
