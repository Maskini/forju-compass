import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as policy from '../../lib/assistant.ts';
const code=ts.transpileModule(readFileSync(new URL('../../lib/server/assistant.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
export function assistantHarness(catalog,{answer,status='completed',providerError=null,budgetAllowed=true}={}){
 const calls={embeddings:[],responses:[],reservations:[]};
 class OpenAI { responses={create:async(body)=>{calls.responses.push(body);if(providerError)throw providerError;return {status,output_text:answer}}}; }
 const modules={'server-only':{},openai:{default:OpenAI},'node:fs':{mkdirSync:()=>{}},'node:path':{dirname:()=>'',resolve:()=>'/isolated-test'},
  '@/lib/knowledge':{knowledgeCatalog:catalog},'@/lib/assistant':policy,'./assistant-budget.mjs':{reservationMicros:()=>100,openAssistantBudget:()=>({reserve:(...args)=>{calls.reservations.push(args);return budgetAllowed}})}};
 const exports={};new Function('require','exports',code)(id=>{if(!(id in modules))throw Error(id);return modules[id]},exports);
 return {...exports,calls};
}
