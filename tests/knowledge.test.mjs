import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {validateFeedback} from '../lib/feedback.ts';
import {safeSourceUrl} from '../lib/chat.ts';
const catalog=JSON.parse(readFileSync(new URL('../knowledge/catalog.json',import.meta.url),'utf8'));
const code=ts.transpileModule(readFileSync(new URL('../lib/knowledge.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const exports={};new Function('require','exports',code)(()=>catalog,exports);
const {selectCatalogKnowledge,hasValidCitations}=exports;
test('unknown and superseded database rows cannot become knowledge',()=>{
 assert.deepEqual(selectCatalogKnowledge([{title:'ForJu Compass Testwissen',similarity:1},{title:'forju-kb:organisation:old',similarity:1}], 'ForJu'),[]);
});
test('catalog content and statuses win over manipulated database payloads',()=>{
 const entry=catalog.find(e=>e.id==='finanzierung');
 const matches=selectCatalogKnowledge([{title:entry.indexTitle,similarity:0.8,content:'Guarantee money',source_url:'javascript:evil()'}],'Mikroförderungen');
 assert.equal(matches[0].kind,'public-website');assert.equal(matches[0].page,0);assert.equal(matches[0].content,entry.content);assert.equal(matches[0].url,entry.sourceUrl);
});
test('internal staff guidance is excluded and every entry has provenance',()=>{
 assert.ok(catalog.length >= 35);assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length);
 for(const e of catalog){assert.match(e.sourceUrl,/^https:\/\/(forju\.at|(?:www|at|de)\.linkedin\.com)\//);assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(e.content.trim());assert.doesNotMatch(e.content,/INTERNER ORIENTIERUNGSTEXT/);}
 assert.equal(catalog.find(e=>e.id==='finanzierung').kind,'public-website');
});
test('invalid scores and duplicate rows do not create misleading sources',()=>{
 const title=catalog[0].indexTitle;
 const matches=selectCatalogKnowledge([{title,similarity:NaN},{title,similarity:0.8},{title,similarity:0.7}],'ForJu');assert.equal(matches.filter(m=>m.id!=="kontakt").length,1);
});
test('citations must exist and refer to supplied evidence',()=>{
 assert.equal(hasValidCitations('Claim',3),false);assert.equal(hasValidCitations('Claim [Quelle 9]',3),false);assert.equal(hasValidCitations('Claim [Quelle 1]',3),true);
 assert.equal(safeSourceUrl('/wissen/finanzierung'),'/wissen/finanzierung');assert.equal(safeSourceUrl('//evil.com'),null);assert.equal(safeSourceUrl('/wissen/../../secret'),null);
});
test('feedback requires explicit opt-in and bounded content',()=>{
 assert.throws(()=>validateFeedback({question:'Help'}));assert.throws(()=>validateFeedback({question:'x'.repeat(2001),consent:true}));assert.equal(validateFeedback({question:'Help',consent:true}).status,'pending-review');
});
test('structured answers validate evidence without visible citation clutter',()=>{
 assert.equal(exports.renderGroundedAnswer(JSON.stringify({paragraphs:[{text:'A claim',sources:[1,1]}],readMore:[]}),2),'A claim');
 for(const p of [[],[{text:'Claim',sources:[]}],[{text:'Claim',sources:[99]}],[{text:'Claim',sources:['1']}],[{text:'',sources:[1]}]]) assert.equal(exports.renderGroundedAnswer(JSON.stringify({paragraphs:p}),2),null);
 assert.equal(exports.renderGroundedAnswer('not JSON',2),null);
});

test('read-more links are optional and must be supported by the answer',()=>{
 const paragraphs=[{text:'Helpful answer',sources:[1]}];
 assert.deepEqual(exports.parseGroundedAnswer(JSON.stringify({paragraphs,readMore:[]}),3),{answer:'Helpful answer',readMore:[]});
 assert.deepEqual(exports.parseGroundedAnswer(JSON.stringify({paragraphs,readMore:[1,1]}),3).readMore,[1]);
 for(const readMore of [[2],[99],['1'],[1,1,1,1]]) assert.equal(exports.parseGroundedAnswer(JSON.stringify({paragraphs,readMore}),3),null);
 assert.equal(exports.parseGroundedAnswer(JSON.stringify({paragraphs:[{text:'See https://invented.example',sources:[1]}],readMore:[]}),3),null);
});
test('public provenance gate rejects internal documents even when active',()=>{
 const isolated={};
 new Function('require','exports',code)(()=>[...catalog,{...catalog[0],id:'private',indexTitle:'private-title',kind:'organization',page:1,sourceUrl:'/internal.pdf'}],isolated);
 assert.deepEqual(isolated.selectCatalogKnowledge([{title:'private-title',similarity:1}],'internal'),[]);
});
test('new topics are retrievable before vector import and planned work stays labelled',()=>{
 const entry=catalog.find(e=>e.id==='workshop-medien');
 assert.equal(selectCatalogKnowledge([{title:entry.indexTitle,similarity:0}],'TikTok Workshop')[0].id,entry.id);
 assert.equal(catalog.find(e=>e.id==='podcast').kind,'planned');
});
test('launcher and panel prompts retrieve the intended public topic in German and English',()=>{
 for(const [id,...qs] of [
 ['mission','Für wen ist ForJu gedacht?','Who is ForJu for?'],
 ['projekte','Welche Projekte gibt es bei ForJu?','What projects does ForJu offer?'],
 ['ehrenamt','Wie kann ich mich ehrenamtlich engagieren?','How can I volunteer?'],
 ['finanzierung','Welche Fördermöglichkeiten gibt es für Schüler:innen?','How can students find project funding?'],
 ['science-beratung','Kannst du mir bei einer Forschungsprojektidee helfen?','Can you help me develop a research idea?']]){
   for(const q of qs)assert.equal(selectCatalogKnowledge(exports.localKnowledge(q),q)[0]?.id,id,q);
 }
});
