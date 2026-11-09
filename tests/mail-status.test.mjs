import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mailStatus} from '../tools/mail-status.mjs';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const id='c560fca0-46d7-493a-9973-a43bb5344871';
test('delivery lookup uses only a GET with the receipt ID and never prints message contents',async()=>{
 const calls=[];
 const result=await mailStatus(id,'test-key',async(url,options)=>{calls.push({url,options});return Response.json({last_event:'delivered',text:'private message',to:['private@example.org'],subject:'private title'})});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.resend.com/emails/'+id);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.body,undefined);
 assert.equal(result.state,'delivered');assert.match(result.note,/Inbox placement still needs checking/);assert.doesNotMatch(JSON.stringify(result),/private|test-key/);
});
test('sending-only credentials, missing records, errors and unknown states are explicit without provider content',async()=>{
 for(const code of [401,403,404,429,500])await assert.rejects(mailStatus(id,'test',async()=>Response.json({message:'private-secret'},{status:code})),error=>!error.message.includes('private-secret'));
 await assert.rejects(mailStatus('../evil','test'));await assert.rejects(mailStatus(id,''));
 for(const state of ['bounced','failed','suppressed','sent','delivery_delayed'])assert.equal((await mailStatus(id,'test',async()=>Response.json({last_event:state}))).state,state);
 assert.equal((await mailStatus(id,'test',async()=>Response.json({last_event:'private-unknown'}))).state,'unknown');
});
test('acceptance logger emits only whitelisted receipt metadata, not unsafe provider strings',()=>{
 const exports={},require=createRequire(import.meta.url);
 new Function('require','exports',ts.transpileModule(readFileSync(new URL('../lib/server/mail-diagnostics.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>name==='server-only'?{}:require(name),exports);
 const logs=[],before=console.info;console.info=(...args)=>logs.push(args);
 try{exports.recordMailAcceptance('feedback',id);exports.recordMailAcceptance('project','private@example.org\nsecret');}finally{console.info=before}
 assert.equal(logs.length,1);const data=JSON.parse(logs[0][1]);assert.deepEqual(Object.keys(data).sort(),['at','kind','providerId','state']);assert.equal(data.state,'accepted');
});
