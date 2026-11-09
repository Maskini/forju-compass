import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
const host='https://127.0.0.1:4201',origin='https://127.0.0.1:4203',receiver='http://127.0.0.1:4204';
test.beforeEach(async({context},info)=>{
 if(process.env.COMPASS_QUOTA_DB!=='/tmp/compass-check-release/quota.sqlite')throw Error('Requires isolated quota DB');
 if(existsSync(process.env.COMPASS_QUOTA_DB)){
  const db=new DatabaseSync(process.env.COMPASS_QUOTA_DB);try{if(db.prepare("select 1 from sqlite_master where name='counts'").get())db.exec('delete from counts')}finally{db.close()}
 }
 const engine=['chromium','firefox','webkit','mobile-webkit'].indexOf(info.project.name);
 const caseId=Number(info.title.startsWith('embedded'))*4+Number(info.title.includes(' / en'))*2+Number(info.title.includes('project recovers'));
 await context.setExtraHTTPHeaders({'X-Audit-Feedback-IP':'192.0.2.'+(100+engine*16+caseId)});
 await context.route('**/*',route=>[host,origin,'http://127.0.0.1:4196'].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
});
async function launch(page,widget,lang,reload=false){
 if(!reload)await page.goto(widget?host+'/'+lang:origin+'/embed?lang='+lang);
 if(!widget)return page;
 const dock=page.locator('forju-compass-widget');
 await expect(dock.locator('dialog')).not.toBeVisible();
 await dock.locator('.launcher').click();await dock.locator('.welcome .start').click();
 return dock.frameLocator('iframe');
}
const input=panel=>panel.getByRole('textbox',{name:/^(Your question|Deine Frage)$/});
async function ask(panel,text){
 const turns=panel.locator('[role=log] article'),n=await turns.count();
 await input(panel).fill(text);await input(panel).press('Enter');await expect(turns).toHaveCount(n+1);return turns.nth(n);
}
async function clear(page,panel,widget){
 await (widget?page.locator('forju-compass-widget .clear'):panel.getByRole('button',{name:/Clear conversation|Gespräch löschen/})).click();
 await panel.locator('.clear-chat-dialog').getByRole('button',{name:/Clear conversation|Gespräch löschen/}).click();
}
for(const widget of [false,true])for(const lang of ['de','en']){
 const title=(widget?'embedded':'standalone')+' / '+lang;
 test(title+' / reload restores conversation, follow-up and unsent text, then trash removes recovery',async({page})=>{
  let panel=await launch(page,widget,lang);
  await ask(panel,lang==='de'?'Welche Workshops bietet ihr für Schulen an?':'Which workshops are available for schools?');
  await input(panel).fill('Synthetic unsent question');await page.reload();panel=await launch(page,widget,lang,true);
  await expect(panel.locator('[role=log] article')).toHaveCount(1);await expect(input(panel)).toHaveValue('Synthetic unsent question');
  const follow=await ask(panel,lang==='de'?'Und wie melde ich meine Klasse dafür an?':'How do I register my class for that?');
  await expect(follow).toContainText('anja.hofer@forju.at');
  await clear(page,panel,widget);await page.reload();panel=await launch(page,widget,lang,true);
  await expect(panel.locator('[role=log] article')).toHaveCount(0);await expect(input(panel)).toHaveValue('');
 });
 test(title+' / project recovers after refresh and lost acknowledgement without duplicate delivery',async({page,request,browser},info)=>{
  await request.post(receiver+'/reset');let panel=await launch(page,widget,lang);
  const idea=lang==='de'?'Unser Klassenprojekt untersucht das Wasser im Schulteich.':'Our class project measures the water in our pond.';
  await ask(panel,idea);await panel.getByRole('button',{name:/Projekt vorstellen|Tell us about your project/}).click();
  let form=panel.locator('.project-draft dialog');
  await expect(form.getByLabel(lang==='de'?'Kurze Beschreibung':'Short description',{exact:false}).first()).toHaveValue(idea);
  await form.getByLabel(lang==='de'?'Projekttitel':'Project title',{exact:true}).fill('Synthetic three ponds');
  await form.getByRole('button',{name:/^Weiter zur Zielgruppe|^Continue to audience/}).click();
  await page.reload();panel=await launch(page,widget,lang,true);
  await expect(panel.locator('.project-draft dialog')).not.toBeVisible();
  await panel.getByRole('button',{name:/Projektangaben fortsetzen|Continue your project details/}).click();form=panel.locator('.project-draft dialog');
  await expect(form.locator('h3[tabindex]')).toHaveText(lang==='de'?'Zielgruppe':'Audience');
  await form.getByRole('button',{name:/6.*(?:Überprüfen|Prüfen|Review)/}).click();
  await expect(form.getByLabel(lang==='de'?'Projekttitel':'Project title',{exact:true})).toHaveValue('Synthetic three ponds');
  let send=form.getByRole('button',{name:/^(Senden|Send)$/});await send.click();
  await expect(form.getByRole('status')).toContainText(lang==='de'?'Der Versand wurde nicht bestätigt':'Sending wasn’t confirmed');
  await page.reload();panel=await launch(page,widget,lang,true);
  await panel.getByRole('button',{name:/Projektangaben fortsetzen|Continue your project details/}).click();form=panel.locator('.project-draft dialog');
  send=form.getByRole('button',{name:/^(Senden|Send)$/});await expect(send).toBeEnabled();await send.click();
  await expect(form.getByRole('status')).toContainText(lang==='de'?'zum Versand':'accepted for delivery');
  const inbox=await (await request.get(receiver+'/inbox')).json();expect(inbox.messages).toHaveLength(1);expect(inbox.attempts).toHaveLength(2);expect(new Set(inbox.attempts).size).toBe(1);expect(inbox.messages[0].mail.text).toContain('Synthetic three ponds');
  await page.reload();panel=await launch(page,widget,lang,true);await panel.getByRole('button',{name:/Projektangaben fortsetzen|Continue your project details/}).click();form=panel.locator('.project-draft dialog');
  await expect(form.getByRole('button',{name:/^(Gesendet|Sent)$/})).toBeDisabled();
  await info.attach('recovered-project.png',{body:await page.screenshot(),contentType:'image/png'});
  await form.getByRole('button',{name:/Back to chat|Zurück zum Chat/}).click();await clear(page,panel,widget);
  await page.reload();panel=await launch(page,widget,lang,true);await panel.getByRole('button',{name:/Projekt vorstellen|Tell us about your project/}).click();
  await expect(panel.getByLabel(lang==='de'?'Projekttitel':'Project title',{exact:true})).toHaveValue('');
  const other=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
  try{const fresh=await other.newPage();await fresh.goto(origin+'/embed?lang=en');await expect(fresh.locator('[role=log] article')).toHaveCount(0);await fresh.getByRole('button',{name:'Tell us about your project →'}).click();await expect(fresh.getByLabel('Project title',{exact:true})).toHaveValue('');}finally{await other.close()}
 });
}
test('expired or corrupted recovery is ignored; storage-blocked visitors can still use the chat',async({page,context})=>{
 await page.goto(origin+'/embed?lang=en');await ask(page,'Hello');
 await page.evaluate(()=>{for(const key of Object.keys(sessionStorage)){if(key.startsWith('forju-compass:recovery:')){const record=JSON.parse(sessionStorage.getItem(key));record.expiresAt=0;sessionStorage.setItem(key,JSON.stringify(record));}}});
 await page.reload();await expect(page.locator('[role=log] article')).toHaveCount(0);
 await page.evaluate(()=>sessionStorage.setItem('forju-compass:recovery:v1:embed:chat','{broken'));await page.reload();await expect(input(page)).toBeEnabled();await expect(page.locator('[role=log] article')).toHaveCount(0);
 await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError')}}));
 await page.reload();await expect(await ask(page,'Hello')).toContainText(/hi|hello|help/i);
});
test('refresh during a pending answer restores the unsent question without automatically posting it',async({page,context})=>{
 await page.goto(origin+'/embed?lang=en');let posts=0;
 let release;const held=new Promise(resolve=>{release=resolve});
 await context.route('**/api/chat',async route=>{posts++;await held;await route.abort().catch(()=>{});});
 await input(page).fill('Synthetic interrupted question');await input(page).press('Enter');await expect.poll(()=>posts).toBe(1);
 await page.reload();release();await expect(input(page)).toHaveValue('Synthetic interrupted question');expect(posts).toBe(1);
});
test('clearing a project while a send response is pending never resurrects its saved data',async({page,context})=>{
 await page.goto(origin+'/embed?lang=en');await page.getByRole('button',{name:'Tell us about your project →'}).click();
 const form=page.locator('.project-draft dialog');await form.getByLabel('Project title',{exact:true}).fill('Delete this synthetic project');
 await form.getByRole('button',{name:/6.*Review/}).click();
 let release,posts=0;const held=new Promise(resolve=>{release=resolve});
 await context.route('**/api/project-submission',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts++;await held;await route.fulfill({json:{accepted:true}}).catch(()=>{});
 });
 await form.getByRole('button',{name:'Send',exact:true}).click();await expect.poll(()=>posts).toBe(1);
 await form.getByRole('button',{name:'← Back to chat'}).click();await clear(page,page,false);
 const reply=page.waitForResponse(r=>r.url().endsWith('/api/project-submission')&&r.request().method()==='POST');release();await reply;
 await page.reload();await page.getByRole('button',{name:'Tell us about your project →'}).click();
 await expect(page.getByLabel('Project title',{exact:true})).toHaveValue('');
});
test('late clear-dialog focus acknowledgement leaves a visitor already typing in control',async({page})=>{
 const panel=await launch(page,true,'en');await page.locator('forju-compass-widget .clear').click();
 await panel.locator('.clear-chat-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 const composer=input(panel);await composer.fill('Keep my typing focus');
 await page.locator('forju-compass-widget iframe').evaluate(frame=>frame.contentWindow.postMessage({type:'forju:clear-focus-check'},'https://127.0.0.1:4203'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(composer).toBeFocused();await expect(composer).toHaveValue('Keep my typing focus');
});
