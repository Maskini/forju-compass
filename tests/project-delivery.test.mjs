import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as requestBody from "../lib/server/request-body.mjs";
const require=createRequire(import.meta.url);
function load(path,overrides={}){
 const src=readFileSync(new URL(path,import.meta.url),"utf8"),out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,e={};
 new Function("require","exports",out)(id=>id==="server-only"?{}:(overrides[id]??require(id)),e);return e;
}

const constants=load("../lib/project-mail.ts"),calls=[];
let result={data:{id:"synthetic"}};
class FakeResend { emails={send:async (...args)=>{calls.push(args);return result}} }
const mod=load("../lib/server/project-submission.ts",{"./request-body.mjs":requestBody,"../project-mail":constants,resend:{Resend:FakeResend}});
const config=()=>({key:"fake-only",from:"demo@example.org"}),limit=()=>({allowed:true,retryAfter:0});
const post=mod.createProjectHandler({config,limit,deliver:mod.deliverProject});
const body={draft:"Our synthetic class project.",language:"en",confirmed:true};
function req(data=body,headers={}){return new Request("https://example.org/api/project-submission",{method:"POST",headers:{origin:"https://example.org","content-type":"application/json","idempotency-key":"a5620233-c52d-4a39-a9f2-72f7724d99e5",...headers},body:JSON.stringify(data)})}
test("missing or sandbox sender disables direct mail",()=>{
 assert.equal(mod.projectMailConfig({RESEND_API_KEY:"fake",PROJECT_FROM_EMAIL:"onboarding@resend.dev"}),null);
 assert.equal(mod.projectMailConfig({RESEND_API_KEY:"fake"}),null);
 assert.equal(mod.projectMailConfig({RESEND_API_KEY:"fake",FEEDBACK_FROM_EMAIL:"onboarding@resend.dev"}),null);
 assert.equal(mod.projectMailConfig({RESEND_API_KEY:"fake",FEEDBACK_FROM_EMAIL:"team@example.org"}).from,"team@example.org");
 assert.equal(mod.projectMailConfig({RESEND_API_KEY:"fake",PROJECT_FROM_EMAIL:"demo@example.org"}).from,"demo@example.org");
});
test("no confirmation, alternative recipient, chat history, invalid reply-to, oversize or cross-site must not call transport",async()=>{
 for(const extra of [{confirmed:false},{to:"x@example.org"},{history:["private"]},{replyEmail:"bad"},{draft:"a".repeat(16001)}])assert.equal((await post(req({...body,...extra}))).status,400);
 assert.equal((await post(req(body,{origin:"https://another.example"}))).status,403);
 const blocked=mod.createProjectHandler({config,limit:()=>({allowed:false,retryAfter:10}),deliver:mod.deliverProject});
 assert.equal((await blocked(req())).status,429);
 const off=mod.createProjectHandler({config:()=>null,limit,deliver:mod.deliverProject});assert.equal((await off(req())).status,503);
 assert.equal(calls.length,0);
});
test("mock provider rejection and retry use identical key; only provider acceptance yields success",async()=>{
 result={error:{message:"rejected"}};assert.equal((await post(req())).status,502);
 result={data:{}};assert.equal((await post(req())).status,502);
 result={data:{id:"fake-only"}};assert.deepEqual(await (await post(req())).json(),{accepted:true});
 assert.deepEqual(calls.at(-1),calls.at(-2));assert.deepEqual(calls.at(-1)[0],{from:"demo@example.org",to:["adam.maskini@forju.at"],subject:"[ForJu Compass] Project draft",text:body.draft});
 assert.equal((await post(req({...body,replyEmail:"visitor@example.org"}))).status,200);assert.equal(calls.at(-1)[0].replyTo,"visitor@example.org");
});
