import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as chat from '../lib/chat.ts';

const catalog = JSON.parse(readFileSync(new URL('../knowledge/catalog.json',import.meta.url),'utf8'));
const knowledgeModule = {};
const knowledgeCode = ts.transpileModule(readFileSync(new URL('../lib/knowledge.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','exports',knowledgeCode)(() => catalog,knowledgeModule);

const compiled = ts.transpileModule(readFileSync(new URL('../app/api/chat/route.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({matches=[],searchError=null,answer=JSON.stringify({paragraphs:[{text:'Antwort',sources:[1]}],readMore:[1]}),status='completed'}={}) {
  const calls={embeddings:[],responses:[]};
  class OpenAI {
    embeddings={create:async (input)=>{calls.embeddings.push(input);return {data:[{embedding:[0.1]}]};}};
    responses={create:async (input)=>{calls.responses.push(input);return {status,output_text:answer};}};
  }
  const modules={"@/lib/server/ai-limit":{takeAiRequest:()=>0},openai:{default:OpenAI},'next/server':{NextResponse:Response},'@/lib/chat':chat,'@/lib/knowledge':knowledgeModule,'@/lib/server/public-retrieval':{retrievePublicKnowledge:async()=>{if(searchError)throw Error('Search failed');return matches;}}};
  const exports={};
  new Function('require','exports',compiled)((id)=>modules[id],exports);
  return {POST:exports.POST,calls};
}
const request=(body)=>new Request('http://localhost/api/chat',{method:'POST',body:JSON.stringify(body)});
const knowledge=[{title:catalog[0].indexTitle,content:'Untrusted DB text',source_url:'https://example.com/workshop',similarity:0.8}];

test('chat request flow',async(t)=>{
 const mode=process.env.COMPASS_LOCAL_ONLY; process.env.COMPASS_LOCAL_ONLY='false';
 const original=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test-only';
 try {
  await t.test('invalid JSON is rejected before external calls',async()=>{
   const {POST,calls}=setup();const result=await POST(new Request('http://localhost/api/chat',{method:'POST',body:'{'}));
   assert.equal(result.status,400);assert.equal(calls.embeddings.length,0);
  });
  await t.test('empty retrieval returns fallback without generation',async()=>{
   const {POST,calls}=setup();const result=await POST(request({message:'Wer?'}));
   assert.equal(result.status,200);assert.deepEqual((await result.json()).sources,[]);assert.equal(calls.responses.length,0);
  });
  await t.test('follow-up reaches retrieval and model with safe source links',async()=>{
   const {POST,calls}=setup({matches:knowledge});
   const history=[{role:'user',content:'Schulworkshop?'},{role:'assistant',content:'Ein Workshop für Schulen.'}];
   const result=await POST(request({message:'Und welche Themen gibt es?',history}));
   assert.equal(result.status,200);assert.match(calls.embeddings[0].input,/Schulworkshop/);
   assert.deepEqual(calls.responses[0].input.slice(0,2),history);assert.equal(calls.responses[0].store,false);
   assert.deepEqual((await result.json()).sources,[{title:catalog[0].title,url:catalog[0].sourceUrl}]);
  });
  await t.test('missing citations return a cautious fallback',async()=>{
   const {POST}=setup({matches:knowledge,answer:'Guaranteed money'});const result=await POST(request({message:'Hi'}));
   assert.match((await result.json()).answer,/keine gesicherte/);
  });
  await t.test('incomplete generation still returns a reviewed workshop answer',async()=>{
    const result=await setup({matches:knowledge,status:'incomplete'}).POST(request({message:'TikTok Workshop'}));
    const reply=await result.json();assert.equal(reply.mode,'library');assert.match(reply.answer,/TikTok/);assert.match(reply.sources[0].url,/schulworkshops/);
  });
  await t.test('a failed database does not turn an unknown topic into a fabricated answer',async()=>{
    const result=await setup({searchError:Error()}).POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':'en'},body:JSON.stringify({message:'quantum penguins'})}));
    const reply=await result.json();assert.match(reply.answer,/verified information/);assert.deepEqual(reply.sources,[]);
  });
 } finally { if(mode===undefined) delete process.env.COMPASS_LOCAL_ONLY; else process.env.COMPASS_LOCAL_ONLY=mode;
   if(original===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=original; }
});
test('public catalog fallback handles bilingual questions and a contact follow-up without credentials',async()=>{
 const original=process.env.OPENAI_API_KEY;
 try{
 delete process.env.OPENAI_API_KEY;
 const history=[{role:'user',content:'Can ForJu fund my research project directly?'},{role:'assistant',content:'ForJu helps you find partners.'}];
 for(const [message,lang,context,expected] of [
   ['Can ForJu fund my research project directly?','en',[],/does not directly sponsor/i],
   ['Who should I contact?','en',history,/office@forju\.at/],
   ['Welche Workshops gibt es zu TikTok?','de',[],/TikTok/],
   ['Which IT volunteer jobs are listed?','en',[],/Backend Engineer/],
   ['Ist der Podcast schon veröffentlicht?','de',[],/keine verifizierte Episodenliste/],
   ['How many moons does Jupiter have?','en',[],/don.t have verified/],
 ]){
  const res=await setup().POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':lang},body:JSON.stringify({message,history:context})}));
  const reply=await res.json();assert.equal(reply.mode,'library');assert.match(reply.answer,expected,message);
  for(const source of reply.sources){const url=new URL(source.url);if(url.host==="forju.at")assert.equal(url.pathname.split("/")[1],lang); }assert.doesNotMatch(reply.answer,/\[Quelle/);
 }
 } finally {if(original===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=original;}
});

test('school registration uses reviewed contact details before any provider call', async () => {
  const {POST, calls} = setup();
  const workshop = 'Gibt es für unsere Klasse einen Workshop zu TikTok?';
  const history = [{role:'user', content:workshop}, {role:'assistant', content:'TikTok und Medienkompetenz.'}];
  const followUp = await (await POST(request({message:'Und wie melde ich mich dafür an?', history}))).json();
  assert.match(followUp.answer, /anja\.hofer@forju\.at/);
  assert.equal(followUp.sources[0].url, 'https://forju.at/de/projects/schulworkshops');
  const deadline = await (await POST(request({message:'What is the registration deadline for the school workshop?'}))).json();
  assert.match(deadline.answer, /no registration deadline/);
  assert.equal(deadline.sources[0].url, 'https://forju.at/en/projects/schulworkshops');
  assert.equal(calls.embeddings.length, 0);
  assert.equal(calls.responses.length, 0);
});
