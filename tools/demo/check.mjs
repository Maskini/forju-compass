// Run against a production build. Only the chosen host and /api/chat POSTs are allowed.
import {chromium} from '../visitor-checks/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.DEMO_BASE||'http://127.0.0.1:4283', out=process.env.DEMO_OUT||'work/demo-refresh/check';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const result={base,media:[],conversations:[],external:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('**/*',r=>{
  const req=r.request(),url=new URL(req.url());
  if(url.origin!==base){result.external.push(req.url());return r.abort()}
  if(!['GET','HEAD'].includes(req.method())&&url.pathname!=='/api/chat')throw Error('Unexpected write: '+url.pathname);
  return r.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(base+'/demo');
 const main=page.locator('#workshop-video'),project=page.locator('#project-video');
 await page.getByRole('button',{name:'ForJu-Seite öffnen',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#workshop-video').currentTime>=28&&!document.querySelector('#workshop-video').paused);
 await page.getByRole('button',{name:'Angaben ergänzen',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#project-video').currentTime>=9&&!document.querySelector('#project-video').paused);
 assert.equal(await main.evaluate(v=>v.paused),true);await project.evaluate(v=>v.pause());result.chapters='keyboard seek, unloaded video seek, and pause-other passed';
 for(const [i,v] of [main,project].entries()){
  await v.scrollIntoViewIfNeeded();await v.evaluate(v=>{v.currentTime=0;return v.play()});
  await page.waitForFunction(i=>document.querySelectorAll('video')[i].currentTime>12,i,{timeout:30000});
  await page.screenshot({path:out+'/playing-'+i+'.png'});
  await page.waitForFunction(i=>document.querySelectorAll('video')[i].ended,i,{timeout:55000});
  const meta=await v.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.message??null,frames:v.getVideoPlaybackQuality().totalVideoFrames,audioBytes:v.webkitAudioDecodedByteCount,muted:v.muted,volume:v.volume}));
  assert.equal(Math.round(meta.duration),i?40:36);assert.equal(meta.width,2560);assert.equal(meta.height,1600);assert.ok(meta.audioBytes>0);assert.ok(meta.frames>1000);assert.equal(meta.error,null);assert.equal(meta.muted,false);result.media.push(meta);console.log('Played video',i,JSON.stringify(meta));
 }
 for(const s of [{widget:true,lang:'de',width:390},{widget:false,lang:'en',width:1280}]){
  await page.setViewportSize({width:s.width,height:844});await page.goto(base+(s.widget?'/demo':'/embed?lang=en'));let panel=page,host;
  if(s.widget){host=page.locator('forju-compass-widget');await host.locator('.launcher').click();await host.locator('.welcome .start').click();panel=host.frameLocator('iframe')}
  assert.equal(await panel.locator('input[type=file]').count(),0);assert.equal(await panel.getByRole('button',{name:/Text aus Datei|Insert text from a file/}).count(),0);
  const input=panel.getByRole('textbox',{name:s.lang==='de'?'Deine Frage':'Your question',exact:true});
  const questions=s.lang==='de'?['Welche Workshops bietet ihr für Schulen an?','Und wie melde ich meine Klasse dafür an?']:['Which workshops are available for schools?','How can I register my class?'];
  for(const [i,q] of questions.entries()){await input.fill(q);await input.press('Enter');const a=panel.locator('[role=log] article').nth(i);await a.locator('.response p').waitFor();assert.match(await a.innerText(),/anja.hofer@forju.at/)}
  const source=panel.locator('[role=log] article').last().locator('.read-more a').first();assert.equal(await source.getAttribute('href'),'https://forju.at/'+s.lang+'/projects/schulworkshops');
  assert.equal(await input.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),true);
  await page.screenshot({path:out+'/chat-'+s.lang+'.png'});
  if(host){await host.locator('.close').click();await host.locator('.launcher').click();assert.equal(await panel.locator('[role=log] article').count(),2)}
  result.conversations.push({...s,upload:'absent',followup:'passed'});console.log('Chat passed',JSON.stringify(s));
 }
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));
}finally{await browser.close()}
