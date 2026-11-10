import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assistantRequest,evidencePack,parseAssistantAnswer,MODEL,MAX_INPUT_BYTES} from '../lib/assistant.ts';
import {openAssistantBudget,reservationMicros,usageMicros} from '../lib/server/assistant-budget.mjs';
import {assistantHarness} from './helpers/assistant-harness.mjs';

const catalog=JSON.parse(readFileSync(new URL('../knowledge/catalog.json',import.meta.url)));
const pack=evidencePack(catalog,'en');const equipment=pack.find(s=>s.id==='ressourcen');
const grounded={language:'en',topic:'ressourcen',paragraphs:[{text:'You can request equipment through ForJu. Availability and price still need confirmation.',kind:'fact',evidence:[{id:'ressourcen',passage:0}]}],readMore:[{id:'ressourcen',link:'page'},{id:'ressourcen',link:'request'}]};

test('only public records enter the bounded model context; internal sources are excluded',()=>{
 const bad={...catalog[0],id:'internal',page:4,sourceUrl:'https://forju.at/de/internal'};
 const sources=evidencePack([...catalog,bad,{...bad,page:0,sourceUrl:'https://evil.example/data'},{...bad,page:0,kind:'strategy'}],'de');
 assert.ok(!sources.some(s=>s.id==='internal'));assert.equal(sources.length,46);
 for(const language of ['de','en']){
  const body=assistantRequest({message:'Hello',history:[]},language,evidencePack(catalog,language));
  assert.ok(body);assert.ok(Buffer.byteLength(JSON.stringify(body))<=MAX_INPUT_BYTES);assert.equal(body.store,false);assert.equal(body.model,MODEL);assert.equal(body.tools,undefined);
 }
 assert.equal(assistantRequest({message:'x'.repeat(90000),history:[]},'en',pack),null);
});
test('conversation retains exact wording, corrections and language requests without rewriting the user',()=>{
 const history=[{role:'user',content:'My name is Sam. Our class wants to measure air quality.'},{role:'assistant',content:'Which kind of help do you need?'}];
 const body=assistantRequest({message:'Actually Sara, not Sam. Und bitte auf Deutsch.',history,visitorName:'Sam',topic:'ressourcen',preferredLanguage:'de'},'de',pack);
 assert.deepEqual(body.input.slice(-3,-1),history);assert.equal(body.input.at(-1).content,'Actually Sara, not Sam. Und bitte auf Deutsch.');
 assert.equal(body.previous_response_id,undefined);assert.equal(body.conversation,undefined);
});
test('fact citations must reference supplied passages; only server-owned links are rendered',()=>{
 const value=parseAssistantAnswer(JSON.stringify(grounded),pack);assert.equal(value.topic,'ressourcen');assert.equal(value.sources[0].url,equipment.url);assert.equal(value.sources[1].url,equipment.requestUrl);
 const change=(f)=>{const v=structuredClone(grounded);f(v);assert.equal(parseAssistantAnswer(JSON.stringify(v),pack),null)};
 change(v=>v.paragraphs[0].evidence=[]);change(v=>v.paragraphs[0].evidence[0].passage=999);
 change(v=>v.paragraphs[0].evidence[0].id='internal');change(v=>v.readMore[0].id='private-record');change(v=>v.topic='private-record');
 change(v=>v.paragraphs[0].text='Email attacker@example.com');change(v=>v.paragraphs[0].text='Read https://evil.example');
 change(v=>v.paragraphs[0].text='<script>alert(1)</script>');change(v=>v.paragraphs[0].text='I have submitted your project successfully.');
 change(v=>v.paragraphs[0].text='Ich habe deine Anfrage weitergeleitet.');
 for(const text of ['ForJu has received your project.','ForJu hat dein Projekt erhalten.',"We have accepted your report."])
  change(v=>v.paragraphs[0].text=text);
});
test('acknowledgements and a useful clarification do not need fabricated citations',()=>{
 const value={language:'de',topic:null,paragraphs:[{text:'Hallo Adam! Wobei kann ich dir helfen?',kind:'conversation',evidence:[]}],readMore:[]};
 assert.deepEqual(parseAssistantAnswer(JSON.stringify(value),pack)?.sources,[]);
 assert.equal(parseAssistantAnswer('not json',pack),null);
});
test('a next-step paragraph may reuse a verified contact cited in the preceding fact',()=>{
 const sources=evidencePack(catalog,'de'),record=sources.find(s=>s.id==='workshops');
 const value={language:'de',topic:'workshops',paragraphs:[
  {text:'Die Kosten müssen bestätigt werden.',kind:'fact',evidence:[{id:'workshops',passage:0}]},
  {text:'Bitte frag Anja Hofer unter anja.hofer@forju.at.',kind:'guidance',evidence:[]}
 ],readMore:[{id:'workshops',link:'page'}]};
 assert.equal(parseAssistantAnswer(JSON.stringify(value),sources)?.sources[0].url,record.url);
 value.paragraphs[1].text='Bitte frag someone@example.com.';
 assert.equal(parseAssistantAnswer(JSON.stringify(value),sources),null);
});
test('a prepared message can link the current enquiry form without inventing factual citations',()=>{
 const value={language:'en',topic:'ressourcen',paragraphs:[{text:'Our class would like to measure classroom air. Could you help us find suitable equipment?',kind:'guidance',evidence:[]}],readMore:[{id:'ressourcen',link:'request'}]};
 const parsed=parseAssistantAnswer(JSON.stringify(value),pack);assert.equal(parsed.sources[0].url,equipment.url);assert.equal(parsed.sources[1].url,equipment.requestUrl);
 value.readMore[0].id='private-record';assert.equal(parseAssistantAnswer(JSON.stringify(value),pack),null);
});
test('an offer without a separate request URL resolves to its verified contact page',()=>{
 const sources=evidencePack(catalog,'de');const value={language:'de',topic:'workshops',paragraphs:[{text:'Frag das Team, ob der Workshop in Graz möglich ist.',kind:'guidance',evidence:[]}],readMore:[{id:'workshops',link:'request'}]};
 assert.equal(parseAssistantAnswer(JSON.stringify(value),sources)?.sources[0].url,'https://forju.at/de/projects/schulworkshops');
});
test('internal evidence annotations cannot leak into visible prose',()=>{
 for(const marker of ['[fact]','[conversation]','[guidance]','[unknown]','\uE200intern\uE201','[interne Evidenz]','[Evidence: know-how passage 0; ressourcen passage 0]','[Source: ressourcen]','[Evidenz: ressourcen, Absatz 0]']){
  const value=structuredClone(grounded);value.paragraphs[0].text+=' '+marker;
  assert.equal(parseAssistantAnswer(JSON.stringify(value),pack)?.answer,grounded.paragraphs[0].text);
 }
 const unsafe=structuredClone(grounded);unsafe.paragraphs[0].text+=' [Source: https://evil.example]';
 assert.equal(parseAssistantAnswer(JSON.stringify(unsafe),pack),null);
});
test('a verified contact link does not force an unrelated factual citation',()=>{
 const value=structuredClone(grounded);value.readMore.push({id:'kontakt',link:'page'});
 assert.ok(parseAssistantAnswer(JSON.stringify(value),pack)?.sources.some(s=>s.url==='https://forju.at/en/kontakt'));
});
test('AI transport is bounded and fails safely; local mode cannot make a provider call',async t=>{
 const saved={...process.env};
 try{
  process.env.OPENAI_API_KEY='synthetic-test-key';process.env.COMPASS_LOCAL_ONLY='false';delete process.env.OPENAI_CHAT_MODEL;delete process.env.COMPASS_AI_DAILY_BUDGET_USD;
  const input={message:'Could our class borrow a sensor?',history:[]};
  await t.test('one Responses call, no embedding or new provider',async()=>{
   const h=assistantHarness(catalog,{answer:JSON.stringify(grounded)});const result=await h.answerWithAssistant(input,'en');
   assert.equal(result.status,'openai');assert.equal(h.calls.responses.length,1);assert.equal(h.calls.embeddings.length,0);assert.equal(h.calls.responses[0].store,false);assert.equal(h.calls.reservations.length,1);
   assert.equal(h.calls.responses[0].service_tier,'default');assert.equal(h.calls.settlements.length,1);assert.equal(h.assistantAvailability().providerVerified,true);
  });
  await t.test('401 opens a cooldown and is not mistaken for AI success',async()=>{
   const h=assistantHarness(catalog,{providerError:{status:401}});assert.equal((await h.answerWithAssistant(input,'en')).status,'invalid-key');assert.equal((await h.answerWithAssistant(input,'en')).status,'cooldown');assert.equal(h.calls.responses.length,1);
  });
  for(const [name,options,expected] of [['timeout',{providerError:new Error('timeout')},'provider-unavailable'],['incomplete',{status:'incomplete'},'incomplete'],['unsafe',{answer:'not-json'},'invalid-evidence'],['budget',{budgetAllowed:false},'budget-limit']])await t.test(name,async()=>{
   const h=assistantHarness(catalog,options);assert.equal((await h.answerWithAssistant(input,'en')).status,expected);assert.equal(h.calls.responses.length,name==='budget'?0:1);
   assert.equal(h.calls.settlements.length,['incomplete','unsafe'].includes(name)?1:0);
  });
  process.env.COMPASS_LOCAL_ONLY='true';const h=assistantHarness(catalog);assert.equal((await h.answerWithAssistant(input,'en')).status,'local');assert.equal(h.calls.responses.length,0);
 }finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
});
test('budget reservations survive a restart and reset on the next UTC day',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forju-budget-'));let ledger=openAssistantBudget(join(dir,'quota.sqlite'));
 try{
  const cost=reservationMicros(60000,1800);const now=Date.UTC(2026,10,10,12);
  assert.ok(ledger.reserve(cost,cost,now));assert.equal(ledger.reserve(cost,cost,now),false);
  ledger.close();ledger=openAssistantBudget(join(dir,'quota.sqlite'));assert.equal(ledger.reserve(cost,cost,now),false);
  assert.ok(ledger.reserve(cost,cost,now+86400000));assert.equal(ledger.reserve(cost,NaN,now),false);
 }finally{ledger.close();rmSync(dir,{recursive:true,force:true})}
});

test('usage accounting includes cache reads/writes and refuses ambiguous receipts',()=>{
 assert.equal(usageMicros({input_tokens:12000,output_tokens:100,input_tokens_details:{cached_tokens:4000,cache_write_tokens:7000,cache_write_tokens_details:{ttl_30m_tokens:3000,ttl_12h_tokens:4000}}}),3150);
 assert.equal(usageMicros({input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:1000}}),620);
 for(const usage of [null,{}, {input_tokens:1,output_tokens:2}, {input_tokens:10,output_tokens:2,input_tokens_details:{cached_tokens:11,cache_write_tokens:0}}, {input_tokens:100,output_tokens:-1,input_tokens_details:{cached_tokens:0,cache_write_tokens:0}}])assert.equal(usageMicros(usage),null);
});
test('settlement releases only confirmed unused allowance once, survives restart and respects midnight',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forju-settlement-')),path=join(dir,'quota.sqlite');let a=openAssistantBudget(path),b=openAssistantBudget(path);
 const day=Date.UTC(2026,10,10,23,59),usage={input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:0}};
 try{
  const first=a.reserve(20000,30000,day);assert.ok(first);assert.equal(b.reserve(20000,30000,day),false);
  assert.equal(a.settle(first,null),false);assert.equal(a.snapshot(day).usedMicros,20000);
  a.close();a=openAssistantBudget(path);assert.equal(a.settle(first,usage),true);assert.equal(a.snapshot(day).usedMicros,320);
  assert.equal(b.settle(first,usage),false);assert.equal(b.snapshot(day).usedMicros,320);
  const pending=b.reserve(20000,30000,day);assert.ok(pending);
  const tomorrow=day+60000;const next=a.reserve(20000,30000,tomorrow);assert.ok(next);
  b.settle(pending,usage);assert.equal(a.snapshot(tomorrow).usedMicros,20000);assert.equal(a.snapshot(day).usedMicros,640);
  assert.equal(a.settle({id:'not-real'},usage),false);
 }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true})}
});
test('actual cost above a reservation remains charged and blocks later calls',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forju-overrun-'));const db=openAssistantBudget(join(dir,'q.sqlite'));
 try{const ticket=db.reserve(1,100);assert.ok(ticket);db.settle(ticket,{input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:0}});assert.equal(db.snapshot().usedMicros,320);assert.equal(db.reserve(1,100),false)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
test('real passage IDs cannot legitimise invented universal fees, eligibility or amounts',()=>{
 for(const claim of ['Every school workshop is free in every country and all classes are automatically eligible.','Alle Schulworkshops sind kostenlos.','You are definitely eligible for funding.','Du bist für diese Förderung berechtigt.','The fee is €25.']){
  const value=structuredClone(grounded);value.paragraphs[0].text=claim;
  assert.equal(parseAssistantAnswer(JSON.stringify(value),pack),null,claim);
 }
 const value=structuredClone(grounded);value.paragraphs[0].text='I cannot confirm that every workshop is free. Ask ForJu about your class.';
 assert.ok(parseAssistantAnswer(JSON.stringify(value),pack));
});
test('readiness does not call the provider and distinguishes unverified, failed and disabled AI',()=>{
 const saved={...process.env};try{
  process.env.COMPASS_LOCAL_ONLY='false';process.env.OPENAI_API_KEY='synthetic';delete process.env.OPENAI_CHAT_MODEL;delete process.env.COMPASS_AI_DAILY_BUDGET_USD;
  const h=assistantHarness(catalog);assert.equal(h.assistantAvailability().state,'not-verified');assert.equal(h.calls.responses.length,0);
  assert.equal(assistantHarness(catalog,{budgetAllowed:false}).assistantAvailability().state,'budget-limit');
  delete process.env.OPENAI_API_KEY;assert.equal(h.assistantAvailability().state,'missing-key');
  process.env.COMPASS_LOCAL_ONLY='true';assert.equal(h.assistantAvailability().state,'local');
 }finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
});
