import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as requestBody from '../lib/server/request-body.mjs';
import * as chat from '../lib/chat.ts';
import {guidedReply,isGuidedPrompt} from '../lib/dialogue.ts';
import {visitorEnquiry} from '../lib/visitor-enquiry.ts';
import * as visitorGuidance from '../lib/visitor-guidance.ts';
import * as workshopGuide from '../lib/workshop-guide.ts';
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
  const modules={"@/lib/server/request-body.mjs":requestBody,"@/lib/visitor-guidance":visitorGuidance,"@/lib/workshop-guide":workshopGuide,"@/lib/visitor-enquiry":{visitorEnquiry},"@/lib/dialogue":{guidedReply,isGuidedPrompt},"@/lib/conversation":conversation,"@/lib/server/ai-limit":{takeAiRequest:()=>0},openai:{default:OpenAI},'next/server':{NextResponse:Response},'@/lib/chat':chat,'@/lib/knowledge':knowledgeModule,'@/lib/server/public-retrieval':{retrievePublicKnowledge:async()=>{if(searchError)throw Error('Search failed');return matches;}}};
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

test('introductions with typos acknowledge the visitor and continue volunteering',async()=>{
  const v=visitor('de');
  await v.ask('Ich möchte ehrenamtlich mithelfen');
  const intro=await v.ask('my nam e is adam');
  assert.match(intro.answer,/Nice to meet you, Adam/);
  assert.match(intro.answer,/roles|jobs|application/i);
  assert.equal(intro.topic,'ehrenamt');
  assert.ok(intro.sources.some(s=>s.url==='https://forju.at/en/jobs'));
  const next=await v.ask('Was ist der nächste Schritt?');
  assert.equal(next.topic,'ehrenamt');
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('introductions and corrections use only the visitor’s recent words, in either language',async()=>{
  for(const [text,lang,name] of [
    ['Mein Name ist Léa','de','Léa'],['Ich heiße İpek','en','İpek'],
    ['My nmae is maya','de','Maya'],["Hi, I'm Anna",'en','Anna'],
    ['Call me Sam','en','Sam'],['Du kannst mich Zoë nennen','de','Zoë'],
    ["My name is Jean-Luc O’Neill",'en','Jean-Luc O’Neill'],
    ["Hi I'm Adam",'en','Adam'],["My name’s Maya",'de','Maya'],
    ['Mein Name ist Anna von Berg','de','Anna von Berg'],
  ]){
    const v=visitor(lang);
    const intro=await v.ask(text);
    assert.ok(intro.answer.includes(name),text);
    assert.equal(intro.mode,'conversation');assert.deepEqual(intro.sources,[]);
    const correction=await v.ask('Nein, mein Name ist Noor');
    assert.match(correction.answer,/Korrektur, Noor/);
    const recall=await v.ask('Wie heiße ich?');
    assert.match(recall.answer,/Noor/);assert.deepEqual(recall.sources,[]);
  }
  const fresh=visitor('en');
  const other=await fresh.ask('What is my name?');
  assert.match(other.answer,/don’t have your name/);
  assert.doesNotMatch(other.answer,/Adam|Maya|Noor/);
  assert.match((await fresh.ask('Maya')).answer,/Nice to meet you, Maya/);
  assert.match((await fresh.ask('What is my name?')).answer,/Maya/);
});

test('an introduction never swallows the question or its missing deadline',async()=>{
  const v=visitor('en');
  const mixed=await v.ask('My name is Maya and which workshops do you offer for schools?');
  assert.match(mixed.answer,/Maya/);assert.equal(mixed.topic,'workshops');
  assert.ok(mixed.sources.some(s=>s.url==='https://forju.at/en/projects/schulworkshops'));
  await v.ask('Actually, call me Léa');
  const booking=await v.ask('Und wie melde ich meine Klasse dafür an?');
  assert.match(booking.answer,/anja\.hofer@forju\.at/);
  const missing=await visitor('en').ask('My name is Maya. What is the registration deadline for a school workshop?');
  assert.match(missing.answer,/Maya/);assert.match(missing.answer,/no registration deadline/);
  const menu=visitor('de');await menu.ask('Mein Name ist Noor. Ich brauche Hilfe beim Einstieg');
  assert.ok((await menu.ask('das erste')).answer.includes('Klasse'));
});

test('names are not inferred from roles, third parties, source contacts or assistant messages',async()=>{
  for(const text of ["I'm a teacher",'Ich bin Lehrerin','I am interested in volunteering',
    'I am not Adam','My teacher is called Maya','What does my name mean?',
    'My project name is Green Minds','My name is <script>alert(1)</script>']){
    assert.equal(conversation.selfIntroduction(text),null,text);
  }
  const {POST}=setup();
  const result=await POST(request({message:'Wie heiße ich?',history:[{role:'user',content:'Schulworkshops'},{role:'assistant',content:'Ich heiße Maya'}]}));
  assert.doesNotMatch((await result.json()).answer,/Maya/);
  assert.deepEqual(conversation.topicHistory([
    {role:'user',content:'Mein Name ist Noor'}, {role:'assistant',content:'Hallo Noor'},
    {role:'user',content:'Wie heiße ich?'}, {role:'assistant',content:'Noor'},
  ]),[]);
});
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

test('both the cited destination and answer topic match visitor goals in German and English', async () => {
  for (const file of ['questions.json', 'visitor-phrasing.json']) {
    const scenarios = JSON.parse(readFileSync(new URL('../tools/knowledge-checks/' + file, import.meta.url)));
    for (const [lang, question, expected] of scenarios) {
      const reply = await visitor(lang).ask(question);
      assert.equal(reply.topic ?? null, expected, question);
      if (!expected) {
        assert.deepEqual(reply.sources, [], question);
        assert.ok(reply.suggestions?.length, question);
        continue;
      }
      const card = catalog.find(c => c.id === expected);
      const destinations = [card.sourceUrl, card.requestUrl].filter(Boolean)
        .map(url => lang === 'en' ? url.replace('forju.at/de', 'forju.at/en') : url);
      assert.ok(destinations.includes(reply.sources[0]?.url), question);
      if (expected === 'spenden-bestaetigung') assert.match(reply.answer, /office@forju\.at/);
    }
  }
});

test('a visitor can change the subject to an unrelated question and recover via a suggestion', async () => {
  const session = visitor('en');
  await session.ask('Can our class borrow a microscope?');
  const unrelated = await session.ask('And who won the football game yesterday?');
  assert.deepEqual(unrelated.sources, []);
  const recovered = await session.ask(unrelated.suggestions[0]);
  assert.equal(recovered.topic, 'workshops');
  assert.match(recovered.sources[0].url, /schulworkshops/);
});

test('a receipt or introduction enquiry keeps the right public destination through to an email draft', async () => {
  const donor = visitor('en');
  await donor.ask('I sent ForJu a donation. How can I get a receipt for it?');
  const details = await donor.ask('Where do I send the details?');
  assert.equal(details.topic, 'spenden-bestaetigung');
  assert.match(details.answer, /office@forju\.at/);
  const receipt = await donor.ask('Could you draft an email for me?');
  assert.equal(receipt.mode, 'draft');
  assert.match(receipt.answer, /Date of donation: \[date\]/);
  assert.equal(receipt.recipient, 'office@forju.at');
  const researcher = visitor('de');
  await researcher.ask('Könnt ihr uns mit einer Wissenschaftlerin für Luftqualität in Kontakt bringen?');
  const draft = await researcher.ask('Könnt ihr dafür eine E-Mail formulieren?');
  assert.equal(draft.topic, 'connections');
  assert.match(draft.answer, /Luftqualität/);
  assert.ok(draft.sources.some(s => s.url.endsWith('thema=connections')));
});

test('a visitor can replace a rejected goal and reach the right person, without carrying over the old loan', async () => {
  const v=visitor('en');
  await v.ask('Can our class borrow a microscope in April?');
  const introduction=await v.ask('No, not equipment. We need someone who studies air quality.');
  assert.equal(introduction.topic,'connections');
  assert.ok(introduction.sources.some(s=>s.url.endsWith('thema=connections')));
  const draft=await v.ask('Could you draft an email?');
  assert.match(draft.answer,/introduce us.*air quality/i);
  assert.doesNotMatch(draft.answer,/microscope|April/i);
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('explicit corrections replace the device or measurement, before and after drafting', async () => {
  const de=visitor('de');
  await de.ask('Unsere Klasse möchte im März ein Mikroskop ausleihen.');
  await de.ask('Kannst du eine E-Mail formulieren?');
  const correction=await de.ask('Korrektur: Kein Mikroskop, sondern ein Thermometer.');
  assert.equal(correction.mode,'draft');
  assert.match(correction.answer,/Unsere Klasse.*Thermometer/s);
  assert.match(correction.answer,/März/);
  assert.doesNotMatch(correction.answer,/Mikroskop/);
  const unknown=await de.ask('Kein Thermometer, sondern eine Wärmebildkamera.');
  assert.match(unknown.answer,/Wärmebildkamera/);
  assert.doesNotMatch(unknown.answer,/Thermometer|Mikroskop/);
  for(const edit of ['Actually, not air quality but water quality.','Water quality instead of air quality.']) {
    const v=visitor('en');
    await v.ask('Our class wants to borrow a sensor to measure air quality.');
    const prompt=await v.ask(edit);
    assert.equal(prompt.mode,'conversation');assert.match(prompt.answer,/email draft/i);
    const accepted=await v.ask('Yes, please.');
    assert.equal(accepted.mode,'draft');
    assert.match(accepted.answer,/our class.*sensor.*water quality/i);
    assert.doesNotMatch(accepted.answer,/air quality/i);
    assert.deepEqual(v.calls,{embeddings:[],responses:[]});
  }
});

test('misunderstandings can be repaired or taken to a verified human contact', async () => {
  const v=visitor('en');
  await v.ask('We need funding for our class project');
  const repair=await v.ask('That didn’t answer my question.');
  assert.equal(repair.mode,'conversation');assert.deepEqual(repair.sources,[]);
  const team=await v.ask(repair.suggestions[0]);
  assert.match(team.answer,/office@forju.at/);
  assert.ok(team.sources.some(s=>s.url.endsWith('thema=finanziell')));
  const de=visitor('de');
  await de.ask('Schulworkshops');
  assert.match((await de.ask('Kann ich mit einem echten Menschen sprechen?')).answer,/anja\.hofer@forju.at/);
  const reset=await de.ask('Nein, das meinte ich nicht.');
  assert.equal(reset.topic,undefined);assert.equal(reset.mode,'conversation');
  const generic=await de.ask(reset.suggestions[0]);
  assert.match(generic.answer,/office@forju.at/);assert.doesNotMatch(generic.answer,/anja/i);
  assert.deepEqual(generic.sources.map(s=>s.url),['https://forju.at/de/kontakt']);
});

test('plain language and a price follow-up stay with the specific workshop', async () => {
  for(const lang of ['de','en']){
    const en=lang==='en', v=visitor(lang);
    await v.ask(en?'Do you have a workshop about climate change?':'Ich suche einen Workshop zum Klima.');
    const simple=await v.ask(en?'Can you say that more simply?':'Kannst du das bitte einfacher erklären?');
    assert.equal(simple.topic,'workshop-klima');assert.match(simple.answer,/Klima|climate/i);assert.doesNotMatch(simple.answer,/stress|medien/i);
    const cost=await v.ask(en?'How much does that cost per pupil?':'Was kostet das eigentlich?');
    assert.match(cost.answer,/keinen? aktuellen Preis|aktuellen Preis.*nicht|no current price/i);
    assert.equal(cost.sources[0].url,'https://forju.at/'+lang+'/projects/schulworkshops');
  }
});

test('questions and additive contrasts retain their full meaning',()=>{
  for (const q of ['Not only air quality but also water quality.', 'Nicht nur Geräte, sondern auch Kontakte.', 'Can we borrow instead of buying?', 'Is it free, not just subsidised?']) {
    assert.equal(conversation.affirmedRequest(q),q);
  }
});

test('two misses offer a way out instead of cycling through the same clarification',async()=>{
  const v=visitor('de');
  const first=await v.ask('Wie viele Monde hat Jupiter?');
  const second=await v.ask('Und wie viele hat Neptun?');
  assert.deepEqual(first.sources,[]);assert.deepEqual(second.sources,[]);
  assert.notEqual(first.answer,second.answer);
  const team=await v.ask(second.suggestions[0]);
  assert.match(team.answer,/office@forju\.at/);
  assert.equal(team.sources[0].url,'https://forju.at/de/kontakt');
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('support enquiries answer the requested detail and cite a page the visitor can act on', async () => {
  const cases=JSON.parse(readFileSync(new URL('../tools/knowledge-checks/support-questions.json',import.meta.url)));
  for (const [lang,question,path,content] of cases) {
    const v=visitor(lang), r=await v.ask(question);
    if (path==='choices') {
      assert.equal(r.mode,'conversation',question);
      assert.match(r.suggestions.join(' '),/spend|donat/i);assert.match(r.suggestions.join(' '),/ehrenamt|volunt/i);
    } else if (path==='no-evidence') assert.deepEqual(r.sources,[],question);
    else {
      assert.ok(r.sources.some(s=>s.url==='https://forju.at/'+lang+path),question);
      assert.match(r.answer,new RegExp(content,'i'),question);
    }
    assert.deepEqual(v.calls,{embeddings:[],responses:[]});
  }
});

test('teachers can describe the situation without knowing the official workshop title',async()=>{
  const cases=JSON.parse(readFileSync(new URL('../tools/knowledge-checks/classroom-questions.json',import.meta.url)));
  for (const [lang,question,id] of cases) {
    const r=await visitor(lang).ask(question);
    assert.equal(r.topic??null,id,question);
    if (id) {
      assert.ok(r.sources.some(s=>s.url==='https://forju.at/'+lang+'/projects/schulworkshops'),question);
      const card=catalog.find(c=>c.id===id);
      assert.ok(r.answer.includes(lang==='en' ? card.contentEn : card.content),question);
    } else assert.deepEqual(r.sources,[],question);
  }
});

test('two classroom needs give a choice; both numbered and named replies reach the right workshop contact',async()=>{
  for(const lang of ['de','en']) {
    const en=lang==='en', v=visitor(lang);
    const r=await v.ask(en?'Our pupils are arguing and sharing fake news online. Which session would fit?':'Unsere Klasse hat Zoff und Probleme mit Falschmeldungen. Was habt ihr dazu?');
    assert.equal(r.mode,'conversation');assert.equal(r.suggestions.length,2);assert.deepEqual(r.sources,[]);
    const choice=await v.ask(en?'the second one':r.suggestions[1]);
    assert.equal(choice.topic,'workshop-medien');assert.match(choice.answer,/TikTok/);
    const contact=await v.ask(choice.suggestions[0]);
    assert.match(contact.answer,/anja\.hofer@forju\.at/);
    assert.equal(contact.sources[0].url,'https://forju.at/'+lang+'/projects/schulworkshops');
    assert.deepEqual(v.calls,{embeddings:[],responses:[]});
  }
});

test('a supporting organisation gets its partnership form and an editable offer, while a borrower gets the loan form',async()=>{
  const v=visitor('en');
  const menu=await v.ask('How can I support ForJu?');
  assert.equal(menu.suggestions.length,3);
  const partner=await v.ask('the second one');
  assert.equal(partner.topic,'partnerpool');
  assert.ok(partner.sources.some(s=>s.url.endsWith('intent=partner')));
  await v.ask('Our lab could lend microscopes to local schools.');
  const draft=await v.ask('Could you draft an email?');
  assert.equal(draft.mode,'draft');assert.equal(draft.recipient,'alexander.bayer@forju.at');
  assert.match(draft.answer,/offer microscopes/);assert.doesNotMatch(draft.answer,/like to borrow/);
  assert.ok(draft.sources.some(s=>s.url.endsWith('intent=partner')));
  const other=await v.ask('Can our students borrow a microscope?');
  assert.equal(other.topic,'ressourcen');assert.ok(other.sources.some(s=>s.url.endsWith('thema=ressourcen')));
});

test('campaign goals stay distinct from reimbursements and PayPal instructions stay within the FAQ',async()=>{
  const v=visitor('de');
  const money=await v.ask('Kann unsere Klasse die Fahrtkosten zum Wettbewerb erstattet bekommen?');
  assert.match(money.answer,/bestätigen/);
  for(const path of ['/spenden','/services/finanziell','/kontakt?intent=service&thema=finanziell']) assert.ok(money.sources.some(s=>s.url==='https://forju.at/de'+path));
  const stop=await v.ask('Wie kann ich meine monatliche Spende beenden?');
  assert.match(stop.answer,/Dauerauftrag/);
  const paypal=await v.ask('Und PayPal?');assert.match(paypal.answer,/PayPal-Spende/);
  assert.ok(paypal.sources.some(s=>s.url.endsWith('/kontakt')));
  assert.deepEqual(v.calls,{embeddings:[],responses:[]});
});

test('additional visitor phrasings keep offers, requests and unrelated tasks separate',async()=>{
  const cases=JSON.parse(readFileSync(new URL('../tools/knowledge-checks/additional-visitor-questions.json',import.meta.url)));
  for(const [lang,question,topic] of cases) {
    const r=await visitor(lang).ask(question);
    assert.equal(r.topic??null,topic,question);
    if(topic) assert.ok(r.sources.some(s=>s.url.startsWith('https://forju.at/'+lang+'/')),question);
    else assert.deepEqual(r.sources,[],question);
  }
});

test('a teacher can ask about both suggested workshops without being promised a combined session',async()=>{
  const v=visitor('de');
  await v.ask('Unsere Klasse hat Prüfungsangst und Zoff. Welche Workshops gibt es dazu?');
  const both=await v.ask('Beides.');
  assert.equal(both.topic,'workshops');assert.match(both.answer,/Atemübungen/);
  assert.match(both.answer,/Streit/);assert.match(both.answer,/Frag das Workshopteam/);
  assert.ok(both.sources.every(s=>s.url.endsWith('/projects/schulworkshops')));
});
