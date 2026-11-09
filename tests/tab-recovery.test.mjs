import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const require=createRequire(import.meta.url),mod={};
new Function('require','exports',ts.transpileModule(readFileSync(new URL('../lib/tab-recovery.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(require,mod);
const {readRecovery,writeRecovery,clearRecovery,recoveryKey,chatRecoverySchema,projectRecoverySchema,RECOVERY_TTL}=mod;
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
const initial={question:'Synthetic unsent question',pending:'',turns:[],uiLanguage:'de'};
test('per-tab recovery survives reads without extending expiry; expired, malformed and future data are removed',()=>{
 const store=memory(),key=recoveryKey('chat','/embed');
 writeRecovery(store,key,chatRecoverySchema,initial,1000);
 assert.deepEqual(readRecovery(store,key,chatRecoverySchema,1001),initial);
 assert.equal(readRecovery(store,key,chatRecoverySchema,1000+RECOVERY_TTL),undefined);assert.equal(store.values.size,0);
 for(const raw of ['{broken',JSON.stringify({version:2,expiresAt:2000,value:initial}),JSON.stringify({version:1,expiresAt:RECOVERY_TTL+10000,value:initial}),'x'.repeat(400001)]){
  store.setItem(key,raw);assert.equal(readRecovery(store,key,chatRecoverySchema,1000),undefined);assert.equal(store.values.size,0);
 }
});
test('blocked storage stays usable in memory and never throws; oversize data removes stale recovery',()=>{
 const blocked={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};
 assert.doesNotThrow(()=>writeRecovery(blocked,'key',chatRecoverySchema,initial));
 assert.equal(readRecovery(blocked,'key',chatRecoverySchema),undefined);
 assert.doesNotThrow(()=>clearRecovery(blocked,'/embed'));
 const store=memory(),key=recoveryKey('chat','/embed');writeRecovery(store,key,chatRecoverySchema,initial);
 writeRecovery(store,key,chatRecoverySchema,{...initial,question:'x'.repeat(2001)});assert.equal(store.values.size,0);
});
test('clear removes chat and project in this surface only; distinct tabs cannot read each other',()=>{
 const store=memory(),other=memory();
 for(const name of ['chat','project'])store.setItem(recoveryKey(name,'/embed'),'private');
 const standalone=recoveryKey('chat','/');writeRecovery(store,standalone,chatRecoverySchema,initial);
 clearRecovery(store,'/embed');assert.equal(store.values.size,1);assert.ok(store.getItem(standalone));
 assert.equal(readRecovery(other,standalone,chatRecoverySchema),undefined);
});
test('restore validates source URLs and preserves project idempotency and accepted identity, not an open dialog',()=>{
 assert.equal(chatRecoverySchema.safeParse({...initial,turns:[{question:'test',answer:'test',sources:[{title:'bad',url:'javascript:alert(1)'}],suggestions:[],draft:false,answeredAt:0}]}).success,false);
 const project={draftLang:'en',step:5,fields:['Pond study','Two ponds','','','','',''],goals:[],custom:'',seeded:true,delivery:{reply:'',key:'c560fca0-46d7-493a-9973-a43bb5344871',receipt:{identity:'synthetic',state:'accepted'}}};
 const store=memory(),key=recoveryKey('project','/embed');writeRecovery(store,key,projectRecoverySchema,project);
 assert.deepEqual(readRecovery(store,key,projectRecoverySchema),project);assert.equal('open' in project,false);
});
