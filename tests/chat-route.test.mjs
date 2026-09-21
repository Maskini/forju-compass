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
function setup({matches=[],searchError=null,answer=JSON.stringify({paragraphs:[{text:'Antwort',sources:[1]}]}),status='completed'}={}) {
  const calls={embeddings:[],responses:[]};
  class OpenAI {
    embeddings={create:async (input)=>{calls.embeddings.push(input);return {data:[{embedding:[0.1]}]};}};
    responses={create:async (input)=>{calls.responses.push(input);return {status,output_text:answer};}};
  }
  const modules={"@/lib/server/ai-limit":{takeAiRequest:()=>true},openai:{default:OpenAI},'next/server':{NextResponse:Response},'@/lib/chat':chat,'@/lib/knowledge':knowledgeModule,'@/lib/supabase':{supabase:{rpc:async()=>({data:matches,error:searchError})}}};
  const exports={};
  new Function('require','exports',compiled)((id)=>modules[id],exports);
  return {POST:exports.POST,calls};
}
const request=(body)=>new Request('http://localhost/api/chat',{method:'POST',body:JSON.stringify(body)});
const knowledge=[{title:catalog[0].indexTitle,content:'Untrusted DB text',source_url:'https://example.com/workshop',similarity:0.8}];

test('chat request flow',async(t)=>{
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
   const result=await POST(request({message:'Wie melde ich mich an?',history}));
   assert.equal(result.status,200);assert.match(calls.embeddings[0].input,/Schulworkshop/);
   assert.deepEqual(calls.responses[0].input.slice(0,2),history);assert.equal(calls.responses[0].store,false);
   assert.deepEqual((await result.json()).sources,[{title:'[Quelle 1] Was ist ForJu?',url:'/wissen/organisation'},{title:'[Quelle 2] Kontakt zu ForJu',url:'/wissen/kontakt'}]);
  });
  await t.test('missing citations return a cautious fallback',async()=>{
   const {POST}=setup({matches:knowledge,answer:'Guaranteed money'});const result=await POST(request({message:'Hi'}));
   assert.match((await result.json()).answer,/keine ausreichend belegte/);
  });
  await t.test('database errors and incomplete generation return retryable errors',async()=>{
   assert.equal((await setup({searchError:{message:'secret detail'}}).POST(request({message:'Hi'}))).status,503);
   assert.equal((await setup({matches:knowledge,status:'incomplete'}).POST(request({message:'Hi'}))).status,502);
  });
 } finally { if(original===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=original; }
});
