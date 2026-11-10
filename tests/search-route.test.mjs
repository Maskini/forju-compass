import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as requestBody from '../lib/server/request-body.mjs';
test('catalog search cannot bypass the AI budget with an embeddings or database call',async()=>{
 const compiled=ts.transpileModule(readFileSync(new URL('../app/api/search/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={},queries=[];const modules={
  '@/lib/server/request-body.mjs':requestBody,'@/lib/server/ai-limit':{takeAiRequest:()=>0},
  '@/lib/knowledge':{localKnowledge:q=>{queries.push(q);return []},selectCatalogKnowledge:rows=>rows}
 };
 new Function('require','exports',compiled)(id=>{assert.ok(id in modules,'Unexpected network-capable dependency: '+id);return modules[id]},exports);
 const before=process.env.COMPASS_LOCAL_ONLY;process.env.COMPASS_LOCAL_ONLY='false';
 try{
  const result=await exports.POST(new Request('http://localhost/api/search',{method:'POST',body:JSON.stringify({query:'Which workshops can our class request?'})}));
  assert.equal(result.status,200);assert.equal(queries.length,1);assert.deepEqual((await result.json()).results,[]);
 }finally{if(before===undefined)delete process.env.COMPASS_LOCAL_ONLY;else process.env.COMPASS_LOCAL_ONLY=before}
});
