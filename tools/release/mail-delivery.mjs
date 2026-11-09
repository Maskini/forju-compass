// Private repeatable transport check: actual production routes and SDK, with
// synthetic data and a loopback provider. No real credentials or email delivery.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const iCloud=process.argv.includes('--icloud');
const recipient=iCloud?'adam.maskini@icloud.com':'adam.maskini@forju.at';
const sender=iCloud?'onboarding@resend.dev':'compass@example.test';
const outputPath=process.argv.slice(2).find(arg=>arg!=='--icloud');
const inbox=new Map(),attempts=[],results=[];
const receiver=http.createServer(async(req,res)=>{
  const json=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body))};
  if(req.url!=='/emails'||req.method!=='POST'||req.headers.authorization!=='Bearer re_local_fixture')return json(403,{message:'Not a fixture request'});
  let raw='';for await(const chunk of req)raw+=chunk;
  const mail=JSON.parse(raw),key=req.headers['idempotency-key'];
  assert.deepEqual(mail.to,[recipient]);
  assert.equal(mail.from,sender);
  attempts.push(key);
  if(!inbox.has(key)){
    inbox.set(key,{id:crypto.randomUUID(),mail});
    return json(503,{name:'application_error',message:'Synthetic lost acknowledgement'});
  }
  return json(200,{id:inbox.get(key).id});
});
receiver.listen(0,'127.0.0.1');await once(receiver,'listening');
const provider=`http://127.0.0.1:${receiver.address().port}`;
const temp=await mkdtemp(join(tmpdir(),'compass-mail-'));
const origin='http://127.0.0.1:4273';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4273'],{
  env:{...process.env,NODE_ENV:'production',COMPASS_LOCAL_ONLY:'true',OPENAI_API_KEY:'',RESEND_API_KEY:'re_local_fixture',
    RESEND_BASE_URL:provider,FEEDBACK_TO_EMAIL:recipient,FEEDBACK_FROM_EMAIL:sender,
    PROJECT_FROM_EMAIL:sender,FEEDBACK_DEMO_MODE:'false',FEEDBACK_LOCAL_TEST:'false',
    COMPASS_QUOTA_DB:join(temp,'quota.sqlite'),RENDER_EXTERNAL_URL:origin},stdio:['ignore','pipe','pipe']
});
let logs='';server.stdout.on('data',x=>{logs+=x});server.stderr.on('data',x=>{logs+=x});
try{
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Fixture server exited: '+logs);
    try{if((await fetch(origin+'/api/project-submission')).ok)break}catch{}
    await delay(150);
  }
  assert.deepEqual(await(await fetch(origin+'/api/project-submission')).json(),{direct:true});
  for(const lang of ['de','en'])for(const kind of ['feedback','project-submission']){
    const label=`TEST / local receiver / ${kind} / ${lang}`;
    const payload=kind==='feedback'
      ? {type:'technical_problem',description:label,timestamp:new Date().toISOString(),language:lang}
      : {confirmed:true,language:lang,draft:label+'\nSynthetic class project: compare water clarity in two ponds.'};
    const key=crypto.randomUUID();
    const send=()=>fetch(origin+'/api/'+kind,{method:'POST',headers:{origin,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(payload)});
    const failure=await send();assert.equal(failure.status,502);
    const success=await send();assert.equal(success.status,200);
    assert.deepEqual(await success.json(),kind==='feedback'?{success:true}:{accepted:true});
    assert.equal(attempts.at(-1),attempts.at(-2));
    const mail=inbox.get(attempts.at(-1)).mail;
    assert.ok(mail.text.includes(label));assert.equal(mail.reply_to,undefined);
    results.push({kind,language:lang,initialStatus:502,retryStatus:200,recipient:mail.to[0],messageCount:1});
  }
  assert.equal(inbox.size,4);assert.equal(attempts.length,8);
  const receipts=logs.split('\n').filter(line=>line.startsWith('[compass-mail] ')).map(line=>JSON.parse(line.slice('[compass-mail] '.length)));
  assert.equal(receipts.length,4);
  assert.deepEqual([...new Set(receipts.map(x=>x.kind))].sort(),['feedback','project']);
  for(const row of receipts){assert.equal(row.state,'accepted');assert.deepEqual(Object.keys(row).sort(),['at','kind','providerId','state']);assert.ok([...inbox.values()].some(x=>x.id===row.providerId));}
  assert.ok(!logs.includes('TEST / local receiver') && !logs.includes('re_local_fixture') && !logs.includes(recipient));
  const evidence={receiptMetadataVerified:true,scope:'local production routes with simulated provider, no external email',results,messages:inbox.size,attempts:attempts.length};
  if(outputPath)await writeFile(outputPath,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
}finally{
  const closed=once(server,'exit');server.kill('SIGTERM');await closed;
  receiver.close();await rm(temp,{recursive:true,force:true});
}
