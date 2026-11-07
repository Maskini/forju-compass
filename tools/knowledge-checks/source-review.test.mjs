import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {extractPage,fetchPage,approvedUrl,sha} from './extract.mjs';
import {reviewCatalog,sourceChanges,validateCatalog,catalogHash} from './catalog.mjs';
const de='https://forju.at/de/services/ressourcen',en=de.replace('/de/','/en/');
const html=`<!doctype html><html lang="de"><title>Ressourcen</title><script type="application/ld+json">{"datePublished":"2024-05-18","dateModified":"2024-06-09"}</script><body><nav>Private admin tools</nav><main><h1>Ressourcen</h1><h2>Messgeräte anfragen</h2><p>Schulen können Geräte bei Partnern anfragen. Die Verfügbarkeit eines Geräts muss bestätigt werden.</p><p><a href="/de/kontakt?intent=service&amp;thema=ressourcen">Anfragen</a></p><section><h2>Empfohlene Artikel</h2><p>Unrelated project with a made-up price of 9999 euros.</p><a href="/de/spenden">Donate</a></section></main></body></html>`;
function page(url=de){return {...extractPage(html,url),status:'ok'}}
const row={id:'ressourcen',active:true,page:0,kind:'public-website',title:'Ressourcen',titleEn:'Resources',content:'Über Partner Geräte anfragen.',contentEn:'Request equipment through partners.',keywords:'Messgeräte equipment',sourceUrl:de,indexTitle:'old-version',sourceSha256:'a'.repeat(64)};
const snapshot=()=>({fetchedAt:'2026-11-07T10:00:00Z',pages:[page(de),page(en)]});
test('extraction preserves source, headings, language, dates and action; drops related content',()=>{
 const p=extractPage(html,de);assert.equal(p.url,de);assert.equal(p.language,'de');assert.equal(p.dates.modified,'2024-06-09');assert.equal(p.reviewStatus,'pending-human-review');
 assert.ok(p.passages.some(p=>p.heading.includes('Messgeräte anfragen')&&p.text.includes('bestätigt')));
 assert.ok(p.links.some(l=>l.url.includes('thema=ressourcen')));assert.doesNotMatch(JSON.stringify(p),/9999|Private admin|spenden/);
 assert.equal(p.contentHash,extractPage(html.replace('Private admin tools','New irrelevant navigation'),de).contentHash);
});
test('native form fields are preserved, honeypot and hidden controls are not visitor requirements',()=>{
 const p=extractPage('<html lang="en"><main><h1>Project enquiry</h1><p>Tell us about your project.</p><form><label for="n">Name</label><input id="n" name="name" required><label for="s">Subject (optional)</label><input id="s" name="subject"><label for="c">Firma (bitte leer lassen)</label><input id="c" name="company"><input type="hidden" name="csrf"><label for="m">Message</label><textarea id="m" name="message" required></textarea></form></main></html>',en);
 assert.deepEqual(p.forms[0].map(f=>[f.name,f.required]),[['name',true],['subject',false],['message',true]]);assert.equal(p.language,'en');
});
test('structured card fallback keeps separate offers; long text is not silently truncated',()=>{
 const p=extractPage('<main><h1>Jobs</h1><section><h2>Technology</h2><div>Frontend Engineer — volunteer</div><h2>Operations</h2><div>Community Manager — volunteer</div><p>'+('Equipment inquiries stay unconfirmed. '.repeat(140))+'FINALWORD</p></section></main>',de);
 assert.match(JSON.stringify(p.passages),/Frontend Engineer/);assert.match(JSON.stringify(p.passages),/Community Manager/);assert.match(JSON.stringify(p.passages),/FINALWORD/);assert.ok(p.passages.every(p=>p.text.length<=1100));
 assert.throws(()=>extractPage('<h1>No main content</h1>',de),/Missing main/);
 assert.throws(()=>extractPage('<main><h1>Only a heading</h1></main>',de),/Insufficient/);
});
test('scripts, frames, images and styles cannot execute or fetch during HTML parsing',async()=>{
 let requests=0;const server=createServer((req,res)=>{requests++;res.end('unexpected')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url='http://127.0.0.1:'+server.address().port;
 const p=extractPage(html.replace('<main>',`<script>fetch('${url}');document.querySelector('h1').textContent='executed'</script><script src="${url}/js"></script><link rel="stylesheet" href="${url}/css"><iframe src="${url}/frame"></iframe><img src="${url}/image"><main>`),de);
 await new Promise(r=>setTimeout(r,50));assert.equal(requests,0);assert.equal(p.title,'Ressourcen');assert.doesNotMatch(JSON.stringify(p.passages),/executed|fetch/);
 }finally{await new Promise(r=>server.close(r))}
});
test('fetch only exact public allowlist: redirects cannot escape, no secrets or huge response',async()=>{
 for(const u of ['http://forju.at/de','https://evil.example','https://forju.at.evil.example/de','https://user:pass@forju.at/de',de+'#x'])assert.throws(()=>approvedUrl(u,[u]));
 let calls=0;await assert.rejects(fetchPage(de,[de],async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/admin'}})}),/allowlist/);assert.equal(calls,1);
 await assert.rejects(fetchPage(de,[de],async()=>new Response('x'.repeat(2_000_001),{headers:{'content-type':'text/html'}})),/2 MB/);
 await assert.rejects(fetchPage(de,[de],async()=>new Response('{}',{headers:{'content-type':'application/json'}})),/HTML/);
 const p=await fetchPage(de,[de],async()=>new Response(html,{headers:{'content-type':'text/html'}}));assert.equal(p.status,'ok');
});
test('removed and transient failure are distinct; redirects require review',async()=>{
 const p=await fetchPage(de,[de],async()=>new Response(null,{status:410}));assert.equal(p.status,'removed');
 await assert.rejects(fetchPage(de,[de],async()=>new Response(null,{status:503})),/503/);
 const p2=await fetchPage(de,[de,en],async url=>url===de?new Response(null,{status:301,headers:{location:en}}):new Response(html,{headers:{'content-type':'text/html'}}));assert.equal(p2.status,'redirected');assert.equal(p2.url,de);
});
test('review requires both source languages and rejects altered, failed or missing snapshots',()=>{
 for(const status of ['removed','unavailable','redirected']){const s=snapshot();s.pages[0].status=status;assert.throws(()=>reviewCatalog([row],s,[row.id]),/Cannot approve/)}
 const s=snapshot();s.pages.pop();assert.throws(()=>reviewCatalog([row],s,[row.id]),/both language/);
 const altered=snapshot();altered.pages[0].passages[0].text='tampered';assert.throws(()=>reviewCatalog([row],altered,[row.id]),/changed/);
 assert.throws(()=>reviewCatalog([row],snapshot(),[]),/Select/);assert.throws(()=>reviewCatalog([row],snapshot(),['unknown']),/Unknown/);
});
test('English, contacts and guided answers invalidate an old vector version; retirement persists',()=>{
 const result=reviewCatalog([row],snapshot(),['ressourcen']);const r=result.catalog[0];assert.notEqual(r.indexTitle,row.indexTitle);assert.equal(r.lastReviewedAt,'2026-11-07');assert.equal(r.nextReviewAt,'2026-12-07');
 for(const change of [{contentEn:'Changed answer'},{booking:{en:'Changed instruction'}},{publicContact:{email:'office@forju.at'}}]){assert.notEqual(catalogHash({...r,...change}),r.sourceSha256);assert.throws(()=>validateCatalog([{...r,...change}]),/needs review/)}
 assert.equal(reviewCatalog([r],snapshot(),[],result.state,['ressourcen']).catalog[0].active,false);assert.equal(row.active,true);
 assert.equal(sourceChanges([r],snapshot().pages,result.state)[0].change,'unchanged');
 assert.equal(sourceChanges([r],[{...page(),contentHash:sha('new')}],result.state)[0].change,'changed');
 assert.deepEqual(sourceChanges([r],[{url:de,status:'removed'}],result.state)[0].affected,['ressourcen']);
});
test('private and foreign content cannot become approved catalog records',()=>{
 for(const change of [{page:7},{kind:'internal'},{sourceUrl:'https://example.com/info'},{sourceUrl:'http://forju.at/de'},{sourceUrl:'https://user:pass@forju.at/de'}])assert.throws(()=>validateCatalog([{...row,...change}]));
 assert.throws(()=>validateCatalog([row,row]),/Duplicate/);
});


test('reviewing one topic cannot hide changed evidence for another topic on the same page',()=>{
 const second={...row,id:'other-offer',indexTitle:'other-version'};
 const r=reviewCatalog([row,second],snapshot(),['ressourcen']);
 const changes=sourceChanges(r.catalog,snapshot().pages,r.state);
 assert.equal(changes[0].change,'partially-reviewed');assert.deepEqual(changes[0].pending,['other-offer']);
});
