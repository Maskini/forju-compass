import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
const host='https://127.0.0.1:4201', app='http://127.0.0.1:4196', receiver='http://127.0.0.1:4204';
const external=new WeakMap();
async function guard(context){
  const attempts=[];external.set(context,attempts);
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(![app,host,'https://127.0.0.1:4202','https://127.0.0.1:4203'].includes(url.origin)){
      attempts.push(url.origin+url.pathname);return route.abort();
    }
    return route.continue();
  });
}
test.beforeEach(async({context},info)=>{
  if(process.env.COMPASS_QUOTA_DB!=='/tmp/compass-check-release/quota.sqlite')throw Error('Requires isolated release DB');
  if(existsSync(process.env.COMPASS_QUOTA_DB)){
    const db=new DatabaseSync(process.env.COMPASS_QUOTA_DB);
    try{if(db.prepare("select 1 from sqlite_master where name='counts'").get())db.exec('delete from counts')}finally{db.close()}
  }
  // The local reverse proxy models a distinct trusted ingress client for each journey.
  const engine=['chromium','firefox','webkit','mobile-webkit'].indexOf(info.project.name);
  const visitor=10 + 4*engine + Number(info.title.startsWith('embedded'));
  await context.setExtraHTTPHeaders({'X-Audit-Feedback-IP':'192.0.2.'+visitor});
  await guard(context);
});
test.afterEach(async({context},info)=>{
  await info.attach('browser-egress.json',{body:JSON.stringify(external.get(context)),contentType:'application/json'});
  expect(external.get(context)).toEqual([]);
});
async function visit(page,widget,lang){
  if(!widget){await page.goto('https://127.0.0.1:4203/');return page;}
  await page.goto(host+'/'+lang);
  const hostWidget=page.locator('forju-compass-widget');
  await hostWidget.locator('.launcher').press('Enter');await hostWidget.locator('.welcome .start').press('Enter');
  return hostWidget.frameLocator('iframe');
}
async function ask(panel,widget,text){
  const turns=panel.locator(widget?'[role=log] article':'.chat-turn');
  const index=await turns.count();
  const input=panel.getByRole('textbox',{name:/^(Frage an ForJu Compass|Your question|Deine Frage)$/});
  await input.fill(text);await input.press('Enter');const turn=turns.nth(index);
  await expect(turn).toBeVisible();return turn;
}
async function scan(page,info,state){
  const scan=new AxeBuilder({page});
  if(info.title.startsWith('standalone')) scan.include(state==='project' ? '.project-draft dialog[open]' : '#feedback-drawer[open]');
  const results=await scan.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const issues=results.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target)}));
  await info.attach('axe-'+state,{body:JSON.stringify(issues),contentType:'application/json'});
  expect(issues).toEqual([]);
}
for(const widget of [false,true]){
  const surface=widget?'embedded':'standalone';
  test(surface+' / teacher books with the published workshop contact',async({page,context})=>{
    const panel=await visit(page,widget,'de');
    await ask(panel,widget,'Wir suchen einen Schulworkshop zu Konflikten für unsere Klasse.');
    const reply=await ask(panel,widget,'Und wie melde ich meine Klasse dafür an?');
    await expect(reply).toContainText('anja.hofer@forju.at');
    const url='https://forju.at/de/projects/schulworkshops';
    const citation=reply.locator('a[href="'+url+'"]').first();
    await expect(citation).toBeVisible();
    // Destination-only fixture. No live ForJu request or visitor text leaves the machine.
    await context.route(url,r=>r.fulfill({contentType:'text/html',body:'<title>Offline citation destination</title><h1>Schulworkshops</h1>'}));
    const popup=page.waitForEvent('popup');await citation.click();const target=await popup;
    await expect(target).toHaveURL(url);await target.close();
  });
  test(surface+' / edit, resume and copy exactly the final project in an isolated session',async({page,browser},info)=>{
    const panel=await visit(page,widget,widget?'en':'de');
    const idea=widget?'Our class project measures the water in our pond.':'Unser Klassenprojekt untersucht das Wasser im Schulteich.';
    await ask(panel,widget,idea);
    await panel.getByRole('button',{name:/Start a project draft|Projektentwurf starten/}).click();
    const form=panel.locator('.project-draft dialog');
    await expect(form.locator('h3[tabindex]')).toBeFocused();
    const description=form.getByLabel(widget?'Short description':'Kurze Beschreibung',{exact:false}).first();
    await expect(description).toHaveValue(idea);
    const edited=widget?'We will sample water in two ponds.':'Wir messen das Wasser in zwei Teichen.';
    await description.fill(edited);
    await form.getByLabel(widget?'Project title':'Projekttitel',{exact:true}).fill('Pond study');
    const next=form.getByRole('button',{name:/^(Weiter|Continue)/});
    await next.click();await form.getByRole('button',{name:/Back to chat|Zurück zum Chat/}).click();
    const resume=panel.getByRole('button',{name:/Continue project draft|Projektentwurf fortsetzen/});
    await expect(resume).toBeFocused();await resume.press('Enter');
    for(let step=1;step<5;step++)await next.click();
    await form.getByText(widget?'View final text':'Fertigen Text ansehen',{exact:true}).click();
    const finalText=form.getByRole('textbox',{name:/Select and copy your project|Projekttext auswählen/});
    const expected=widget?'Hello ForJu team,\n\nProject title: Pond study\n\nShort description: '+edited+'\n\nThank you!':'Hallo ForJu-Team,\n\nProjekttitel: Pond study\n\nKurze Beschreibung: '+edited+'\n\nVielen Dank!';
    await expect(finalText).toHaveValue(expected);
    await finalText.focus();await finalText.press('Control+a');await finalText.press('Control+c');
    const paste=form.getByRole('textbox',{name:widget?'Expected impact':'Erwartete Wirkung',exact:true});
    await paste.focus();await paste.press('Control+v');await expect(paste).toHaveValue(expected);
    await paste.fill('');
    const send=form.getByRole('button',{name:widget?'Send':'Senden',exact:true});await expect(send).toBeInViewport();
    await send.click();await expect(form.getByRole('status')).toContainText(widget?'wasn’t sent':'nicht gesendet');
    await scan(page,info,'project');
    const other=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
    try{await guard(other);const otherPage=await other.newPage();await otherPage.goto(app);
      await expect(otherPage.locator('.chat-turn')).toHaveCount(0);await otherPage.getByRole('button',{name:/Projektentwurf starten/}).click();
      await expect(otherPage.getByLabel('Projekttitel',{exact:true})).toHaveValue('');
      await expect(otherPage.getByLabel('Kurze Beschreibung',{exact:true})).toHaveValue('');
      expect(external.get(other)).toEqual([]);
    }finally{await other.close()}
  });
  test(surface+' / wrong-answer report survives lost acknowledgement, one local email',async({page,request},info)=>{
    await request.post(receiver+'/reset');
    const panel=await visit(page,widget,widget?'en':'de');
    await ask(panel,widget,'Private synthetic canary XJ873.');
    const question=widget?'Which workshops are available for schools?':'Welche Workshops bietet ihr für Schulen an?';
    const turn=await ask(panel,widget,question);
    const answer=await turn.locator(widget?'.response p':'.chat-answer').innerText();
    const button=turn.getByRole('button',{name:/Report this answer|Diese Antwort melden/});await button.press('Enter');
    const form=panel.locator('#feedback-drawer');
    await expect(form.locator('.feedback-close')).toBeFocused();
    const consent=form.locator('.report-context input[type=checkbox]');
    await expect(consent).not.toBeChecked();if(widget)await consent.check();
    const text='Synthetic report: workshop information is unclear.';
    await form.locator('[name=description]').fill(text);
    const posts=[];page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/feedback')posts.push(r.postDataJSON())});
    await form.locator('.feedback-submit').click();await expect(form.getByRole('alert')).toBeVisible();
    await expect(form.locator('[name=description]')).toHaveValue(text);
    await scan(page,info,'report-error');
    const retry=form.getByRole('button',{name:/Retry|Erneut versuchen/});
    await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport();await retry.press('Enter');
    await expect(form.locator('.feedback-success')).toBeVisible();
    const inbox=await (await request.get(receiver+'/inbox',{maxRetries:1})).json();
    expect(inbox.messages).toHaveLength(1);expect(inbox.attempts).toHaveLength(2);expect(new Set(inbox.attempts).size).toBe(1);
    expect(posts).toHaveLength(2);expect(posts[0]).toEqual(posts[1]);
    expect(posts[0].exchange).toEqual(widget?{question,answer}:undefined);
    expect(JSON.stringify(posts)).not.toContain('XJ873');
    const mail=inbox.messages[0].mail;
    expect(mail.reply_to ?? mail.replyTo).toBeUndefined();
    expect(posts[0]).not.toHaveProperty('history');
    expect(mail.to).toEqual(['adam.maskini@forju.at']);expect(mail.text).toContain(text);expect(mail.text).not.toContain('XJ873');
    if(widget){expect(mail.text).toContain(question);expect(mail.text).toContain(answer)}else expect(mail.text).not.toContain(question);
    await info.attach('local-mail-receipt.json',{body:JSON.stringify({id:inbox.messages[0].id,attempts:2,count:1,exchangeIncluded:widget}),contentType:'application/json'});
    await form.locator('.feedback-close').press('Enter');await expect(button).toBeFocused();await expect(turn).toContainText(question);
  });
}
test('unapproved local HTTPS origin cannot display the Compass frame',async({page})=>{
  const security=[];page.on('console',m=>security.push(m.text()));
  await page.goto('https://127.0.0.1:4202/en');
  await page.locator('forju-compass-widget .launcher').click();await page.locator('forju-compass-widget .welcome .start').click();
  await expect(page.locator('forju-compass-widget .recovery')).toBeVisible();
  await expect.poll(()=>security.some(x=>/frame-ancestors|content.security.policy|framing/i.test(x))).toBe(true);
  await expect(page.locator('forju-compass-widget iframe')).toBeHidden();
});
test('visitor markup is inert and cannot trigger egress',async({page})=>{
  const panel=await visit(page,true,'en');
  const payload='<img src=https://private.invalid/example onerror=alert(1)>';
  const turn=await ask(panel,true,payload);await expect(turn.locator('.question-bubble')).toHaveText(payload);
  await expect(turn.locator('img')).toHaveCount(0);
});
