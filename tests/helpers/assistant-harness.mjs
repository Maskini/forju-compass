import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as policy from '../../lib/assistant.ts';
const code=ts.transpileModule(readFileSync(new URL('../../lib/server/assistant.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
export function assistantHarness(catalog,{answer,status='completed',providerError=null,budgetAllowed=true,usage={input_tokens:2000,output_tokens:100,input_tokens_details:{cached_tokens:0,cache_write_tokens:0}}}={}){
 const calls={embeddings:[],responses:[],reservations:[],settlements:[]};
 class OpenAI { responses={create:async(body)=>{calls.responses.push(body);if(providerError)throw providerError;return {status,output_text:answer,usage,service_tier:'default'}}}; }
 const modules={'server-only':{},openai:{default:OpenAI},'node:fs':{mkdirSync:()=>{}},'node:path':{dirname:()=>'',resolve:()=>'/isolated-test'},
  '@/lib/knowledge':{knowledgeCatalog:catalog},'@/lib/assistant':policy,'./assistant-budget.mjs':{reservationMicros:()=>100,openAssistantBudget:()=>({snapshot:()=>({usedMicros:budgetAllowed?0:1000000}),settle:(...args)=>{calls.settlements.push(args);return true},reserve:(...args)=>{calls.reservations.push(args);return budgetAllowed?{id:'test-reservation',day:'2026-11-10'}:false}})}};
 const exports={};new Function('require','exports',code)(id=>{if(!(id in modules))throw Error(id);return modules[id]},exports);
 return {...exports,calls};
}
