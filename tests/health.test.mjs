import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../app/api/health/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function health(state,mail){
 const modules={'@/lib/server/assistant':{assistantAvailability:()=>({state,providerVerified:state==='available'})},'@/lib/server/project-submission':{projectMailConfig:()=>mail?{key:'never-public',to:'private@example.test'}:null}};
 const exports={};new Function('require','exports',code)(id=>{assert.ok(id in modules);return modules[id]},exports);return exports.GET();
}
test('health separates application liveness from unavailable AI without making a provider request',async()=>{
 for(const state of ['local','not-verified','budget-limit','missing-key','provider-unavailable','available']){
  const response=health(state,true),value=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(value,{status:'alive',assistant:{state,providerVerified:state==='available'},projectDelivery:'configured-not-verified'});
  assert.doesNotMatch(JSON.stringify(value),/never-public|private@example/);
 }
});
test('health detects unusable quota storage and does not claim unconfigured mail can send',async()=>{
 const response=health('budget-unavailable',false);assert.equal(response.status,503);assert.equal((await response.json()).projectDelivery,'unavailable');
});
