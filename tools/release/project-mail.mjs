// Exercise the configured route separately from the deliberately unconfigured
// browser release fixture, using the same production build and loopback inbox.
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4198', endpoint=origin+'/api/project-submission', receiver='http://127.0.0.1:4204';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4198'],{
  env:{...process.env,PROJECT_FROM_EMAIL:'compass@example.test',RENDER_EXTERNAL_URL:origin,NODE_OPTIONS:'--require=/app/tools/release/server-observer.cjs'},stdio:['ignore','inherit','inherit']
});
try{
  for(let i=0;i<50;i++){try{if((await (await fetch(endpoint)).json()).direct)break}catch{}await delay(200)}
  assert.equal((await (await fetch(endpoint)).json()).direct,true);
  await fetch(receiver+'/reset',{method:'POST'});
  const draft='Synthetic project: compare water clarity in two ponds.', key=crypto.randomUUID();
  const send=(confirmed)=>fetch(endpoint,{method:'POST',headers:{origin,'content-type':'application/json','idempotency-key':key},body:JSON.stringify({confirmed,draft,language:'en'})});
  assert.equal((await send(false)).status,400);
  assert.equal((await send(true)).status,502);
  const retry=await send(true);assert.equal(retry.status,200);assert.deepEqual(await retry.json(),{accepted:true});
  const inbox=await (await fetch(receiver+'/inbox')).json();
  assert.equal(inbox.messages.length,1);assert.equal(inbox.attempts.length,2);
  assert.deepEqual(inbox.messages[0].mail.to,['adam.maskini@forju.at']);assert.equal(inbox.messages[0].mail.text,draft);
  console.log('PASS: no unconfirmed send; lost acknowledgement returned 502; retry accepted with one exact draft in the local receiver.');
}finally{server.kill('SIGTERM')}
