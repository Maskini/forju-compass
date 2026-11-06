import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as chat from '../lib/chat.ts';
import {guidedReply,isGuidedPrompt} from '../lib/dialogue.ts';
import {visitorEnquiry} from '../lib/visitor-enquiry.ts';
import * as conversation from '../lib/conversation.ts';

const catalog = JSON.parse(readFileSync(new URL('../knowledge/catalog.json',import.meta.url),'utf8'));
const knowledgeModule = {};
const knowledgeCode = ts.transpileModule(readFileSync(new URL('../lib/knowledge.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','exports',knowledgeCode)(() => catalog,knowledgeModule);

const compiled = ts.transpileModule(readFileSync(new URL('../app/api/chat/route.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({matches=[],searchError=null,answer=JSON.stringify({paragraphs:[{text:'Antwort',sources:[1]}],readMore:[1]}),status='completed'}={}) {
  const calls={embeddings:[],responses:[]};
  class OpenAI {
    embeddings={create:async (input)=>{calls.embeddings.push(input);return {data:[{embedding:[0.1]}]};}};
    responses={create:async (input)=>{calls.responses.push(input);return {status,output_text:answer};}};
  }
  const modules={"@/lib/visitor-enquiry":{visitorEnquiry},"@/lib/dialogue":{guidedReply,isGuidedPrompt},"@/lib/conversation":conversation,"@/lib/server/ai-limit":{takeAiRequest:()=>0},openai:{default:OpenAI},'next/server':{NextResponse:Response},'@/lib/chat':chat,'@/lib/knowledge':knowledgeModule,'@/lib/server/public-retrieval':{retrievePublicKnowledge:async()=>{if(searchError)throw Error('Search failed');return matches;}}};
  const exports={};
  new Function('require','exports',compiled)((id)=>modules[id],exports);
  return {POST:exports.POST,calls};
}
const request=(body)=>new Request('http://localhost/api/chat',{method:'POST',body:JSON.stringify(body)});
const knowledge=[{title:catalog[0].indexTitle,content:'Untrusted DB text',source_url:'https://example.com/workshop',similarity:0.8}];

test('chat request flow',async(t)=>{
 const mode=process.env.COMPASS_LOCAL_ONLY; process.env.COMPASS_LOCAL_ONLY='false';
 const original=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test-only';
 try {
  await t.test('invalid JSON is rejected before external calls',async()=>{
   const {POST,calls}=setup();const result=await POST(new Request('http://localhost/api/chat',{method:'POST',body:'{'}));
   assert.equal(result.status,400);assert.equal(calls.embeddings.length,0);
  });
  await t.test('empty retrieval returns fallback without generation',async()=>{
   const {POST,calls}=setup();const result=await POST(request({message:'Wer?'}));
   assert.equal(result.status,200);assert.deepEqual((await result.json()).sources,[]);assert.equal(calls.responses.length,0);
  });
  await t.test('follow-up reaches retrieval and model with safe source links',async()=>{
   const {POST,calls}=setup({matches:knowledge});
   const history=[{role:'user',content:'Schulworkshop?'},{role:'assistant',content:'Ein Workshop für Schulen.'}];
   const result=await POST(request({message:'Und welche Themen gibt es?',history}));
   assert.equal(result.status,200);assert.match(calls.embeddings[0].input,/Schulworkshop/);
   assert.deepEqual(calls.responses[0].input.slice(0,2),history);assert.equal(calls.responses[0].store,false);
   assert.deepEqual((await result.json()).sources,[{title:catalog[0].title,url:catalog[0].sourceUrl}]);
  });
  await t.test('missing citations return a cautious fallback',async()=>{
   const {POST}=setup({matches:knowledge,answer:'Guaranteed money'});const result=await POST(request({message:'Welche Mondstationen gibt es?'}));
   assert.match((await result.json()).answer,/keine gesicherte/);
  });
  await t.test('incomplete generation still returns a reviewed workshop answer',async()=>{
    const result=await setup({matches:knowledge,status:'incomplete'}).POST(request({message:'TikTok Workshop'}));
    const reply=await result.json();assert.equal(reply.mode,'library');assert.match(reply.answer,/TikTok/);assert.match(reply.sources[0].url,/schulworkshops/);
  });
  await t.test('a failed database does not turn an unknown topic into a fabricated answer',async()=>{
    const result=await setup({searchError:Error()}).POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':'en'},body:JSON.stringify({message:'quantum penguins'})}));
    const reply=await result.json();assert.match(reply.answer,/verified information/);assert.deepEqual(reply.sources,[]);
  });
 } finally { if(mode===undefined) delete process.env.COMPASS_LOCAL_ONLY; else process.env.COMPASS_LOCAL_ONLY=mode;
   if(original===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=original; }
});
test('public catalog fallback handles bilingual questions and a contact follow-up without credentials',async()=>{
 const original=process.env.OPENAI_API_KEY;
 try{
 delete process.env.OPENAI_API_KEY;
 const history=[{role:'user',content:'Can ForJu fund my research project directly?'},{role:'assistant',content:'ForJu helps you find partners.'}];
 for(const [message,lang,context,expected] of [
   ['Can ForJu fund my research project directly?','en',[],/does not directly sponsor/i],
   ['Who should I contact?','en',history,/office@forju\.at/],
   ['Welche Workshops gibt es zu TikTok?','de',[],/TikTok/],
   ['Which IT volunteer jobs are listed?','en',[],/Backend Engineer/],
   ['Ist der Podcast schon veröffentlicht?','de',[],/keine verifizierte Episodenliste/],
   ['How many moons does Jupiter have?','en',[],/don.t have verified/],
 ]){
  const res=await setup().POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':lang},body:JSON.stringify({message,history:context})}));
  const reply=await res.json();assert.equal(reply.mode,'library');assert.match(reply.answer,expected,message);
  for(const source of reply.sources){const url=new URL(source.url);if(url.host==="forju.at")assert.equal(url.pathname.split("/")[1],lang); }assert.doesNotMatch(reply.answer,/\[Quelle/);
 }
 } finally {if(original===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=original;}
});

test('school registration uses reviewed contact details before any provider call', async () => {
  const {POST, calls} = setup();
  const workshop = 'Gibt es für unsere Klasse einen Workshop zu TikTok?';
  const history = [{role:'user', content:workshop}, {role:'assistant', content:'TikTok und Medienkompetenz.'}];
  const followUp = await (await POST(request({message:'Und wie melde ich mich dafür an?', history}))).json();
  assert.match(followUp.answer, /anja\.hofer@forju\.at/);
  assert.equal(followUp.sources[0].url, 'https://forju.at/de/projects/schulworkshops');
  const deadline = await (await POST(request({message:'What is the registration deadline for the school workshop?'}))).json();
  assert.match(deadline.answer, /no registration deadline/);
  assert.equal(deadline.sources[0].url, 'https://forju.at/en/projects/schulworkshops');
  assert.equal(calls.embeddings.length, 0);
  assert.equal(calls.responses.length, 0);
});

test('catalog follows an equipment request through cost and contact questions', async () => {
  const {POST, calls} = setup();
  const history = [];
  for (const [message, expected, path] of [
    ['Can our class borrow something to measure air quality?', /particular device.*needs confirmation/i, '/services/ressourcen'],
    ['Would it be free of charge?', /no loan price/i, '/services/ressourcen'],
    ['Who should I contact?', /office@forju.at/, '/kontakt?intent=service&thema=ressourcen'],
  ]) {
    const res = await POST(new Request('http://localhost/api/chat', {
      method: 'POST', headers: {'Accept-Language':'en'}, body: JSON.stringify({message, history}),
    }));
    const reply = await res.json();
    assert.match(reply.answer, expected);
    assert.ok(reply.sources.some(source => source.url === 'https://forju.at/en' + path));
    history.push({role:'user', content:message}, {role:'assistant', content:reply.answer});
  }
  assert.equal(calls.embeddings.length, 0);
});

test('ordinary conversation needs neither a knowledge citation nor a provider call',async()=>{
  const {POST,calls}=setup();
  for(const [message,lang,pattern] of [['hi','de',/^Hallo/],['Hi! 👋','en',/^Hi/],['Servus Compass!','en',/^Hallo/],['Danke dir!','de',/Gerne/],['Thank you','de',/welcome/],['Hallo, was kannst du?','de',/Workshop/],['👋','de',/^Hallo/]]){
    const r=await POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':lang},body:JSON.stringify({message})}));
    const v=await r.json();assert.equal(v.mode,'conversation',message);assert.match(v.answer,pattern);assert.deepEqual(v.sources,[]);
  }
  assert.deepEqual(calls,{embeddings:[],responses:[]});
});

test('a mixed greeting still answers the actual question, and thanks does not erase the topic',async()=>{
  const {POST}=setup();
  const question='Hi, welche Workshops gibt es für Schulen?';
  const reply=await (await POST(request({message:question}))).json();
  assert.match(reply.sources[0].url,/schulworkshops/);
  const history=[{role:'user',content:question},{role:'assistant',content:reply.answer},{role:'user',content:'Danke!'},{role:'assistant',content:'Gerne!'}];
  const follow=await (await POST(request({message:'Und wie melde ich meine Klasse dafür an?',history}))).json();
  assert.match(follow.answer,/anja\.hofer@forju\.at/);assert.match(follow.sources[0].url,/schulworkshops/);
});

function visitor(lang){
  const {POST,calls}=setup(); const history=[];let topic;
  return {calls,async ask(message){
    const res=await POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Accept-Language':lang},body:JSON.stringify({message,history:history.slice(-8),topic})}));
    assert.equal(res.status,200);
    const r=await res.json();topic=r.topic;
    history.push({role:'user',content:message},{role:'assistant',content:r.answer});
    return r;
  }};
}
test('an unsure class can describe its need, simplify the equipment answer and act on it',async()=>{
  const v=visitor('de');const menu=await v.ask('Ich weiß nicht, wo ich anfangen soll.');
  assert.equal(menu.suggestions.length,3);assert.deepEqual(menu.sources,[]);
  const school=await v.ask('Für meine Klasse');assert.equal(school.suggestions.length,3);assert.deepEqual(school.sources,[]);
  const equipment=await v.ask('Wir brauchen etwas zum Messen');assert.equal(equipment.topic,'ressourcen');
  const simple=await v.ask('Kannst du das einfacher sagen?');assert.ok(simple.answer.length<equipment.answer.length);
  assert.match(simple.answer,/Messgerät/);assert.match(simple.answer,/kostet/);assert.match(simple.sources[0].url,/services\/ressourcen$/);
  const next=await v.ask(simple.suggestions[0]);assert.match(next.answer,/Öffne das Ressourcenformular/);assert.match(next.sources[1].url,/thema=ressourcen$/);
  assert.notEqual(simple.answer,next.answer);assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});
test('an English visitor can select by number, change their mind and ask for the actual workshop contact',async()=>{
  const v=visitor('en'); assert.equal((await v.ask("I'm not sure where to begin")).mode,'conversation');
  const menu=await v.ask('the first one');assert.match(menu.answer,/help your class/);
  const tools=await v.ask('2');assert.equal(tools.topic,'ressourcen');
  assert.match((await v.ask('How much does it cost?')).answer,/no loan price/);
  const workshop=await v.ask('No, I meant a workshp');assert.equal(workshop.topic,'workshops');
  await v.ask('Thanks!');
  const next=await v.ask("What's the next step?");assert.match(next.answer,/anja\.hofer@forju\.at/);assert.match(next.sources[0].url,/en\/projects\/schulworkshops$/);
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});
test('specific questions, unsupported deadlines, and off-topic questions bypass the navigation choices',async()=>{
  const v=visitor('en');await v.ask('Where do I start?');
  const question=await v.ask('Can our class borrow a device to measure air quality?');assert.equal(question.topic,'ressourcen');
  const deadline=await v.ask('What is the deadline to apply for funding?');assert.match(deadline.answer,/can’t confirm that deadline/);
  const unrelated=await v.ask('How many moons does Jupiter have?');assert.deepEqual(unrelated.sources,[]);
  const unknown=await v.ask('Could you explain in plain English?');assert.deepEqual(unknown.sources,[]);
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});
test('a bare yes does not guess which option, and the pronoun it does not imply IT jobs',async()=>{
  const v=visitor('en');
  const initial=await v.ask('Can you help me?');
  const yes=await v.ask('yes');assert.deepEqual(yes.suggestions,initial.suggestions);assert.equal(yes.suggestions.length,3);assert.deepEqual(yes.sources,[]);
  const vague=await visitor('en').ask('Does it quack?');assert.deepEqual(vague.sources,[]);
});

test('a German workshop enquiry retains the town, workshop theme and the public workshop contact',async()=>{
  const v=visitor('de');
  const first=await v.ask('Wir kommen aus Wiener Neustadt und suchen einen Workshop zum Klima. Geht das bei uns auch?');
  assert.match(first.answer,/Workshop in Wiener Neustadt/);
  assert.match(first.answer,/geht daraus nicht hervor/);
  const draft=await v.ask('Kannst du uns eine E-Mail schreiben?');
  assert.equal(draft.mode,'draft');assert.equal(draft.recipient,'anja.hofer@forju.at');
  assert.match(draft.answer,/Workshop zum Klima für unsere Klasse in Wiener Neustadt/);
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('equipment email uses the latest time in the visitor’s own words and only relevant details',async()=>{
  const v=visitor('en');
  await v.ask('Our class wants to borrow a sensor to measure air quality in March.');
  const first=await v.ask('Could you draft an email?');
  assert.match(first.answer,/Preferred timing: March/);assert.equal(first.recipient,'office@forju.at');
  const corrected=await v.ask('Actually in two weeks instead of March.');
  assert.equal(corrected.mode,'draft');assert.match(corrected.answer,/air quality/);
  assert.match(corrected.answer,/Preferred timing: in two weeks/);assert.doesNotMatch(corrected.answer,/March/);
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('clarify an unanchored draft request and handle bare German months and uncertain dates',async()=>{
  const v=visitor('de');
  const prompt=await v.ask('Kannst du eine E-Mail formulieren?');
  assert.equal(prompt.mode,'conversation');assert.deepEqual(prompt.sources,[]);
  const draft=await v.ask('Unsere Klasse möchte im März ein Mikroskop ausleihen.');
  assert.equal(draft.mode,'draft');assert.match(draft.answer,/Mikroskop/);assert.match(draft.answer,/Zeitraum: März/);
  const next=await v.ask('Korrektur: Termin noch offen.');
  assert.equal(next.mode,'draft');assert.doesNotMatch(next.answer,/März|Zeitraum:/);
});

test('a new equipment request leaves the previous workshop location and month out of the draft',async()=>{
  const v=visitor('en');
  await v.ask('Does ForJu offer workshops for schools in Linz in April?');
  const draft=await v.ask('Draft an email about borrowing a microscope.');
  assert.equal(draft.mode,'draft');assert.match(draft.answer,/microscope/);
  assert.doesNotMatch(draft.answer,/April|Linz|workshop/i);
  const contact=await v.ask('Who should I contact?');assert.notEqual(contact.mode,'draft');
});

test('a mixed workshop question covers both the location and current price', async () => {
  const towns = fc.constantFrom('Graz', 'Linz', 'Wiener Neustadt', 'Innsbruck');
  const costs = fc.constantFrom(
    ['was kostet das pro Kind', 'how much would it cost per pupil'],
    ['ist das kostenlos', 'is it free'],
    ['müssen wir dafür bezahlen', 'would we have to pay'],
  );
  await fc.assert(fc.asyncProperty(fc.boolean(), towns, costs, fc.boolean(), async (english, town, cost, priceFirst) => {
    const visit = english ? 'do you offer workshops in ' + town : 'kommt ihr für einen Schulworkshop nach ' + town;
    const parts = [visit, cost[Number(english)]];
    const query = (priceFirst ? parts.reverse() : parts).join(english ? ', and ' : ', und ') + '?';
    const reply = await visitor(english ? 'en' : 'de').ask(query);
    assert.ok(reply.answer.includes(town));
    assert.match(reply.answer, english ? /current price|current cost/i : /aktuellen Preis|aktuellen Kosten/i);
    assert.match(reply.answer, english ? /confirm|unconfirmed/i : /bestätig|klären/i);
    assert.ok(reply.sources.some(s => s.url.endsWith('/projects/schulworkshops')));
    assert.doesNotMatch(reply.answer, /(?:€|EUR)\s*\d|\d\s*(?:€|EUR)/i);
  }), {numRuns:60, seed:11606});
});

test('a corrected month replaces the old month in a bilingual equipment draft', async () => {
  const months = fc.uniqueArray(fc.constantFrom('April', 'August', 'September', 'November'), {minLength:2,maxLength:2});
  await fc.assert(fc.asyncProperty(fc.boolean(), months, async (en, [first, last]) => {
    const session = visitor(en ? 'en' : 'de');
    await session.ask(en ? 'Our class wants to borrow a microscope in ' + first : 'Unsere Klasse möchte im ' + first + ' ein Mikroskop ausleihen.');
    const draft = await session.ask(en ? 'Could you draft an email?' : 'Kannst du eine E-Mail formulieren?');
    assert.ok(draft.answer.includes(first));
    const revised = await session.ask(en ? 'Actually in ' + last + ' instead of ' + first : 'Korrektur: im ' + last + ' statt im ' + first);
    assert.equal(revised.mode, 'draft');
    assert.ok(revised.answer.includes(last));
    assert.ok(!revised.answer.includes(first));
    assert.match(revised.answer, /microscope|Mikroskop/);
    assert.equal(revised.recipient, 'office@forju.at');
  }), {numRuns:40, seed:11607});
});
