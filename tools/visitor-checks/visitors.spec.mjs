import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { relative } from 'node:path';

test.beforeEach(async ({ context, baseURL }) => {
  // Each journey is a separate visitor trial. Reset only the disposable DB
  // created by run.mjs; all production limits still apply within each journey.
  const fixture = process.env.COMPASS_TEST_QUOTA;
  if (!fixture || !/^compass-check-[a-zA-Z0-9]+[/\\]quota\.sqlite$/.test(relative(tmpdir(),fixture))) throw Error('Expected an isolated visitor-test quota');
  if (existsSync(fixture)) {
    const db = new DatabaseSync(fixture);
    try { db.exec('DELETE FROM counts'); } finally { db.close(); }
  }
  // A test can inspect a public link. It cannot send a message or leave localhost.
  await context.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    const allowed = url.origin === baseURL && (['GET','HEAD'].includes(req.method()) ||
      (req.method() === 'POST' && url.pathname === '/api/chat'));
    return allowed ? route.continue() : route.abort();
  });
});

async function ask(panel, question) {
  const turns = panel.locator('[role=log] article');
  const index = await turns.count();
  const input = panel.getByRole('textbox', { name: /^(?:Deine Frage|Your question)$/ });
  await input.fill(question);
  await input.press('Enter');
  const turn = turns.nth(index);
  await expect(turn.locator('.response p')).toBeVisible();
  return turn;
}
async function checkAccessibility(page, info) {
  const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const violations = scan.violations.map(rule => ({
    id: rule.id, impact: rule.impact, help: rule.help, nodes: rule.nodes.map(node => node.target),
  }));
  await info.attach('accessibility.json', {body: JSON.stringify(violations, null, 2), contentType: 'application/json'});
  expect(violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
}

for (const scenario of [
  {label:'German standalone desktop',lang:'de',widget:false,width:1280,height:850,
    first:'Welche Workshops bietet ihr für Schulen an?',intro:'Mein Name ist Léa',greeting:/Léa/,correction:'Nein, mein Name ist Noor',recall:'Wie heiße ich?',follow:'Und wie melde ich meine Klasse dafür an?'},
  {label:'English widget phone',lang:'en',widget:true,width:390,height:844,
    first:'Which workshops are available for schools?',intro:'my nam e is maya',greeting:/Nice to meet you, Maya/,correction:'Actually, call me Noor',recall:'What is my name?',follow:'How do I register my class for it?'},
]) test('Personal introduction / '+scenario.label,async({page,context,baseURL})=>{
  await page.setViewportSize({width:scenario.width,height:scenario.height});
  let panel=page;
  if(scenario.widget){
    // Real separate origin; all assets and answers stay on local Compass.
    const hostURL='https://www.forju.at/name-preview';
    const compassOrigin='https://compass.example.test';
    await context.route(compassOrigin+'/**',async route=>{
      const url=new URL(route.request().url());
      if(route.request().method()!=='GET' && !(route.request().method()==='POST' && url.pathname==='/api/chat')) return route.abort();
      const response=await route.fetch({url:baseURL+url.pathname+url.search,maxRedirects:0});
      await route.fulfill({response});
    });
    await context.route(hostURL,route=>route.fulfill({contentType:'text/html',body:
      '<!doctype html><html lang="en"><title>Website-Vorschau</title><h1>Website-Vorschau</h1><script defer src="'+compassOrigin+'/compass-widget.js" data-lang="en"></script></html>'}));
    await page.goto(hostURL);
    const host=page.locator('forju-compass-widget');
    await host.locator('.launcher').click();await host.locator('.welcome .start').click();
    panel=host.frameLocator('iframe');
  }else await page.goto('/embed?lang='+scenario.lang);
  await ask(panel,scenario.first);
  const intro=await ask(panel,scenario.intro);
  await expect(intro.locator('.response p')).toContainText(scenario.greeting);
  await expect(intro.locator('.response p')).toContainText('anja.hofer@forju.at');
  await ask(panel,scenario.correction);
  await expect((await ask(panel,scenario.recall)).locator('.response p')).toContainText('Noor');
  const next=await ask(panel,scenario.follow);
  await expect(next.locator('.response p')).toContainText('anja.hofer@forju.at');
  await expect(next.locator('.read-more a').first()).toHaveAttribute('href','https://forju.at/'+scenario.lang+'/projects/schulworkshops');
  if(scenario.widget){
    const host=page.locator('forju-compass-widget');
    await host.locator('.close').click();await host.locator('.launcher').click();
    await expect(panel.locator('[role=log] article')).toHaveCount(5);
  }
});

test('German on mobile: answer whether a Vienna workshop is available in Graz', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/embed?lang=de');
  const first = await ask(page, 'Wir sind eine Klasse aus Graz und möchten einen Schulworkshop zum Klima. Geht das bei uns auch?');
  await expect(first.locator('.read-more a').first()).toHaveAttribute('href','https://forju.at/de/projects/schulworkshops');
  const follow = await ask(page, 'Heißt das, ihr kommt auch nach Graz, und was kostet das pro Kind?');
  const answer = await follow.locator('.response p').innerText();
  expect(answer).toMatch(/aktuellen Preis pro Kind/i);
  expect.soft(answer, 'Address the location asked about').toMatch(/Graz|außerhalb (?:von )?Wien/i);
  expect.soft(answer, 'Explain the uncertainty about regional coverage').toMatch(/nicht bestätigt|nicht bestätigen|nicht belegt|keine (?:Angabe|Bestätigung)|offen|klären|nachfragen|frag.*(?:Team|Anja)|bestätigen lassen|unklar|nicht (?:aus|hervor)/i);
  await expect(follow.locator('.read-more a').first()).toHaveAttribute('href','https://forju.at/de/projects/schulworkshops');
});

test('English: edit and copy an equipment email with the visitor’s month', async ({page, context, browserName, baseURL}, info) => {
  await page.goto('/embed?lang=en');
  const first = await ask(page, 'Our class wants to borrow a sensor to measure air quality in March. Where can we ask?');
  await expect(first.locator('a[href*="thema=ressourcen"]')).toBeVisible();
  const follow = await ask(page, 'Could you write a short email I can send them?');
  const answer = await follow.locator('.response p').innerText();
  expect.soft(answer, 'The visitor can use the draft').toMatch(/(?:hello|dear|hi)\b.{0,25}(?:forju|team)|subject\s*:/i);
  expect.soft(answer, 'Retain what the class wants to measure').toMatch(/air quality/i);
  expect.soft(answer, 'Retain the requested month').toMatch(/March/i);
  expect(answer, 'Keep the enquiry with the equipment team').not.toMatch(/presse@|press contact/i);
  await follow.getByRole('button',{name:'Edit draft'}).click();
  const edited = answer.replace('March','April');
  await follow.getByRole('textbox',{name:'Your email draft'}).fill(edited);
  await follow.getByRole('button',{name:'Done editing'}).click();
  const mail = new URL(await follow.getByRole('link',{name:'Open in email app'}).getAttribute('href'));
  expect(mail.pathname).toEqual('office@forju.at');
  expect(mail.searchParams.get('body')).toEqual(edited);
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read','clipboard-write'], {origin: baseURL});
  await follow.getByRole('button',{name:'Copy draft'}).click();
  await expect(follow.getByRole('status')).toContainText(/copied|selected/i);
  if (browserName === 'chromium') expect(await page.evaluate(()=>navigator.clipboard.readText())).toEqual(edited);
  await checkAccessibility(page,info);
});

test('Separate website origin: open the widget by keyboard, ask, close and resume', async ({page,context,baseURL}) => {
  // The browser enforces real origin boundaries and the app’s production CSP.
  // Both HTTPS origins are fixtures: asset and chat traffic go to loopback.
  await page.setViewportSize({width:1366,height:850});
  const compassOrigin = 'https://compass.example.test';
  await context.route(compassOrigin+'/**',async route=>{
    const url=new URL(route.request().url());
    if (route.request().method()!=='GET' && !(route.request().method()==='POST' && url.pathname==='/api/chat')) return route.abort();
    const response = await route.fetch({url:baseURL+url.pathname+url.search, maxRedirects:0});
    await route.fulfill({response});
  });
  const preview='https://www.forju.at/visitor-preview';
  await page.route(preview, route => route.fulfill({contentType:'text/html',body:
    '<!doctype html><html lang="en"><title>Website preview</title><main style="min-height:300vh"><h1>Website preview</h1><button style="position:fixed;top:80px">Website action</button></main><script defer src="'+compassOrigin+'/compass-widget.js"></script></html>'}));
  await page.goto(preview);
  const host = page.locator('forju-compass-widget');
  const start = host.locator('.welcome .start');
  const launcher = host.locator('.launcher');
  await expect(start).toBeHidden();
  await launcher.hover();
  await expect(start).toBeHidden();
  await launcher.press('Enter');
  await expect(start).toBeFocused();
  await page.mouse.move(160,420);
  await page.mouse.wheel(0,360);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await start.press('Enter');
  const panel = host.frameLocator('iframe');
  const drawer = host.locator('.drawer');
  await expect(panel.locator('.suggestions')).toBeVisible();
  const compactWidth = (await drawer.boundingBox()).width;
  expect(compactWidth).toBe(430);
  const question = panel.getByRole('textbox',{name:'Your question'});
  await question.fill('Unsent classroom question');
  await host.getByRole('button',{name:'Expand chat',exact:true}).click();
  await expect.poll(async ()=>(await drawer.boundingBox()).width).toBeGreaterThan(compactWidth);
  await expect(question).toHaveValue('Unsent classroom question');
  const hostButton=page.getByRole('button',{name:'Website action'});
  await hostButton.click();
  await expect(hostButton).toBeFocused();
  await expect(drawer).toBeVisible();
  await host.getByRole('button',{name:'Restore compact chat',exact:true}).click();
  const beforePageScroll=await page.evaluate(()=>scrollY);
  await page.mouse.move(200,320);await page.mouse.wheel(0,320);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(beforePageScroll);
  const first = await ask(panel, 'Which workshops are available for schools?');
  await expect(first.locator('a[href*="schulworkshops"]').first()).toBeVisible();
  // WebKit can deliver the tail of the preceding host wheel after the answer
  // renders. Measure the host at rest before testing scrolling inside the frame.
  const pageAt=await page.evaluate(()=>new Promise(resolve=>{
    let timer;
    function onScroll(){
      clearTimeout(timer);
      timer=setTimeout(()=>{window.removeEventListener('scroll',onScroll);resolve(window.scrollY)},150);
    }
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }));
  const log=panel.locator('.embed-log');
  const scrollBox=await log.boundingBox();
  await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  const bottom=await log.evaluate(el=>el.scrollTop);
  await page.mouse.move(scrollBox.x+scrollBox.width/2,scrollBox.y+scrollBox.height/2);
  await page.mouse.wheel(0,-200);
  await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBeLessThan(bottom);
  expect(await page.evaluate(()=>scrollY)).toBe(pageAt);
  const next = await ask(panel, 'How do I register my class for it?');
  await expect(next.locator('.response p')).toContainText('anja.hofer@forju.at');
  const email=await ask(panel, 'Could you draft an email?');
  await expect(email.getByRole('button',{name:'Edit draft'})).toBeVisible();
  await expect(email.getByRole('link',{name:'Open in email app'})).toHaveAttribute('href',/^mailto:anja\.hofer@forju\.at\?/);
  await page.keyboard.press('Escape');
  await expect(host.locator('.drawer')).toBeHidden();
  await expect(host.locator('.launcher')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(start).toBeHidden();
  await expect(panel.locator('[role=log] article')).toHaveCount(3);
});

test('Accessibility: standalone chat with a German answer', async ({page},info) => {
  await page.goto('/embed?lang=de');
  await ask(page, 'Hallo');
  await checkAccessibility(page,info);
});

test('Accessibility: mobile project draft open', async ({page},info) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/embed?lang=en');
  await page.locator('html[lang=en]').waitFor();
  await page.getByRole('button',{name:/start a project draft/i}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await checkAccessibility(page,info);
});

test('Standalone homepage: turn a school workshop enquiry into a German email', async ({page}) => {
  await page.goto('/');
  const input = page.getByRole('textbox',{name:'Frage an ForJu Compass'});
  await input.fill('Kann unsere Klasse in Graz einen Workshop zum Klima machen?');
  await input.press('Enter');
  const turns = page.locator('.chat-turn');
  await expect(turns.first().locator('a[href="https://forju.at/de/projects/schulworkshops"]').first()).toBeVisible();
  await input.fill('Kannst du mir dafür eine E-Mail formulieren?');
  await input.press('Enter');
  const draft = turns.nth(1);
  await expect(draft.locator('.chat-answer')).toContainText('für unsere Klasse in Graz');
  await expect(draft.locator('.chat-answer')).toContainText('zum Klima');
  await expect(draft.getByRole('link',{name:'In Mail-App öffnen'})).toHaveAttribute('href',/^mailto:anja\.hofer@forju\.at\?/);
});

test('stakeholder preview: launch the German widget and recover from an unrelated question', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/preview');
  await expect(page.getByRole('heading', {level:1})).toContainText('ForJu Compass');
  const host = page.locator('forju-compass-widget');
  await host.getByRole('button', {name:'ForJu Compass: Chathilfe'}).click();
  await host.locator('.welcome .start').click();
  const panel = host.frameLocator('iframe');
  await expect(host.locator('.resize')).toBeHidden();
  await expect.poll(()=>host.locator('.drawer').evaluate(el=>el.matches(':modal'))).toBe(true);
  expect(await page.evaluate(()=>document.body.style.overflowY)).toBe('hidden');
  const turn = await ask(panel,'Wie viele Monde hat der Jupiter?');
  await expect(turn.locator('.read-more a')).toHaveCount(0);
  await turn.getByRole('button',{name:'Schulworkshops',exact:true}).click();
  const reply = panel.locator('[role=log] article').last();
  await expect(reply.locator('a[href="https://forju.at/de/projects/schulworkshops"]').first()).toBeVisible();
  await host.getByRole('button',{name:'Chat schließen'}).click();
  await expect(host.locator('.drawer')).toBeHidden();
  expect(await page.evaluate(()=>document.body.style.overflowY)).toBe('');
  await page.getByRole('link',{name:'EN',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('a[href^="/embed"]')).toHaveCount(0);
  await expect(host.locator('.launcher')).toBeVisible();
});

test('English mobile: correct what the class measures, accept a draft, then ask a person', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/preview?lang=en');
  const host=page.locator('forju-compass-widget');
  await host.locator('.launcher').click();
  await host.locator('.welcome .start').click();
  const panel=host.frameLocator('iframe');
  await ask(panel,'Can our class borrow a sensor to measure air quality?');
  const corrected=await ask(panel,'Actually, not air quality but water quality.');
  await expect(corrected.locator('.response p')).toContainText('email draft');
  const draft=await ask(panel,'Yes please');
  const mail=new URL(await draft.getByRole('link',{name:'Open in email app'}).getAttribute('href'));
  expect(mail.pathname).toBe('office@forju.at');
  expect(mail.searchParams.get('body')).toMatch(/sensor to measure water quality/i);
  expect(mail.searchParams.get('body')).not.toMatch(/air quality/i);
  const handoff=await ask(panel,'Can I talk to a real person?');
  await expect(handoff.locator('a[href*="thema=ressourcen"]')).toBeVisible();
});

test('a teacher can choose between two classroom needs and prepare an enquiry on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/preview');
  const host=page.locator('forju-compass-widget');
  await host.locator('.launcher').click();
  await host.locator('.welcome .start').click();
  const panel=host.frameLocator('iframe');
  const options=await ask(panel,'Meine Klasse hat Zoff und Prüfungsangst. Welche Workshops passen dazu?');
  await expect(options.getByRole('button',{name:/Konflikte/})).toBeVisible();
  const selected=await ask(panel,'den ersten');
  await expect(selected.locator('.response p')).toContainText('Streit');
  await expect(selected.locator('a[href$="/de/projects/schulworkshops"]')).toBeVisible();
  const contact=await ask(panel,'Wie melde ich meine Klasse dafür an?');
  await expect(contact.locator('.response p')).toContainText('anja.hofer@forju.at');
  const draft=await ask(panel,'Kannst du dafür eine E-Mail formulieren?');
  const mail=new URL(await draft.getByRole('link',{name:'In Mail-App öffnen'}).getAttribute('href'));
  expect(mail.pathname).toEqual('anja.hofer@forju.at');
  expect(mail.searchParams.get('body')).toContain('Konflikte');
});

test('an English-speaking lab can offer equipment and prepare an email to the partnership contact',async({page})=>{
  await page.goto('/embed?lang=en');
  const offer=await ask(page,'Our lab could lend microscopes to schools. Who should we talk to?');
  await expect(offer.locator('.response p')).toContainText('Alexander Bayer');
  await expect(offer.locator('a[href$="/en/kontakt?intent=partner"]')).toBeVisible();
  const draft=await ask(page,'Could you draft a message for us?');
  const mail=new URL(await draft.getByRole('link',{name:'Open in email app'}).getAttribute('href'));
  expect(mail.pathname).toEqual('alexander.bayer@forju.at');
  expect(mail.searchParams.get('body')).toContain('offer microscopes');
});

test('English phone widget: one Send, retained draft on failure, stable retry and receipt', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  const requests=[];
  await page.route('**/api/project-submission', route=>{
    if(route.request().method()==='GET') return route.fulfill({json:{direct:true}});
    requests.push({data:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});
    return requests.length===1 ? route.fulfill({status:502,json:{error:'unconfirmed'}}) : route.fulfill({json:{accepted:true}});
  });
  await page.goto('/preview?lang=en');
  const host=page.locator('forju-compass-widget');
  await host.locator('.launcher').click();
  await expect(host.locator('.welcome .start svg')).toHaveCount(0);
  await host.locator('.welcome .start').click();
  const panel=host.frameLocator('iframe');
  const turn=await ask(panel,'How can I volunteer?');
  await expect(turn.locator('.read-more a').first()).toBeVisible();
  await expect(turn).not.toContainText(/knowledge catalog/i);
  const report = panel.getByRole('button',{name:'Report a problem',exact:true});
  await expect(report.locator('svg')).toHaveCount(0);
  const contactBar = await panel.locator('aside').boundingBox();
  const reportButton = await report.boundingBox();
  const composer = await panel.locator('.composer').boundingBox();
  expect(reportButton.y).toBeGreaterThanOrEqual(contactBar.y + contactBar.height - 1);
  expect(Math.abs((reportButton.x + reportButton.width/2) - (contactBar.x + contactBar.width/2))).toBeLessThan(1);
  expect(reportButton.y + reportButton.height).toBeLessThanOrEqual(composer.y + 1);
  await report.click();
  const badge=panel.locator('.feedback-report-badge');
  await expect(badge).toBeInViewport();
  const art=await badge.evaluate(b=>{
    const rect=b.getBoundingClientRect(), icon=b.querySelector('svg').getBoundingClientRect();
    return {size:icon.width,dx:Math.abs(icon.x+icon.width/2-rect.x-rect.width/2),dy:Math.abs(icon.y+icon.height/2-rect.y-rect.height/2)};
  });
  expect(art.size).toBe(28);expect(art.dx).toBeLessThan(1);expect(art.dy).toBeLessThan(1);
  await panel.getByRole('button',{name:'Back to chat',exact:true}).click();
  await panel.getByRole('button',{name:/start a project draft/i}).click();
  const review=panel.getByRole('dialog');
  await review.getByLabel('Project title',{exact:true}).fill('Testing our school pond');
  for(let i=0;i<5;i++) {
    await expect(review.getByRole('button',{name:/skip/i})).toHaveCount(0);
    await review.getByRole('button',{name:/^Continue/}).click();
  }
  await expect(review).not.toContainText(/email your draft|recipient:|adam\.maskini@/i);
  await expect(review.getByRole('button',{name:'Copy draft'})).toHaveCount(0);
  await expect(review.getByRole('link')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await review.getByRole('button',{name:'Send',exact:true}).click();
  await expect(review.getByRole('status')).toContainText('wasn’t confirmed');
  await expect(review.getByLabel('Project title',{exact:true})).toHaveValue('Testing our school pond');
  await review.getByRole('button',{name:'Send',exact:true}).click();
  await expect(review.getByRole('status')).toContainText('accepted for delivery');
  await expect(review.getByRole('button',{name:'Sent',exact:true})).toBeDisabled();
  expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
  expect(Object.keys(requests[0].data).sort()).toEqual(['confirmed','draft','language']);
  expect(requests[0].data.draft).toContain('Testing our school pond');
  expect(requests[0].data.draft).not.toContain('volunteer');
  await review.getByRole('button',{name:/^← Back$/}).click();
  await review.getByRole('button',{name:/^Continue/}).click();
  await expect(review.getByRole('button',{name:'Sent',exact:true})).toBeDisabled();
});

test('German desktop: keep the project in the form while offline, then send when delivery recovers', async ({page}) => {
  const {promise: scriptsReady, resolve: loadScripts} = Promise.withResolvers();
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async route => {
    await scriptsReady;
    await route.fallback();
  });
  const report = page.getByRole('button', {name:'Problem melden', exact:true});
  const start = page.getByRole('button', {name:/Projektentwurf starten/});
  try {
    await page.goto('/', {waitUntil:'commit'});
    await expect(report).toBeDisabled();
    await expect(start).toBeDisabled();
  } finally {
    loadScripts();
  }
  await expect(report).toBeEnabled();
  await expect(report.locator('svg')).toHaveCount(0);
  await start.click();
  const review = page.getByRole('dialog');
  await expect(review.getByRole('status')).toContainText('derzeit nicht gesendet');
  await review.getByLabel('Projekttitel', {exact:true}).fill('Luftqualität in der Klasse');
  for (let step = 0; step < 5; step++) await review.getByRole('button', {name:/^Weiter/}).click();
  await expect(review.getByRole('link')).toHaveCount(0);
  await expect(review.getByRole('button', {name:'Entwurf kopieren'})).toHaveCount(0);
  const send = review.getByRole('button', {name:'Senden',exact:true});
  const submissions=[];
  page.on('request', request => {
    if (request.method()==='POST' && new URL(request.url()).pathname==='/api/project-submission') submissions.push(request.postDataJSON());
  });
  await send.click();
  await expect(review.getByRole('status')).toContainText('Dein Projekt wurde nicht gesendet');
  expect(submissions).toEqual([]);
  await expect(review.getByLabel('Projekttitel', {exact:true})).toHaveValue('Luftqualität in der Klasse');

  // Recovery without refreshing the visitor's draft. Never contact a mail provider.
  await page.route('**/api/project-submission', route => route.fulfill({
    json:route.request().method()==='GET' ? {direct:true} : {accepted:true}
  }));
  await send.click();
  await expect(review.getByRole('button', {name:'Gesendet',exact:true})).toBeDisabled();
  expect(submissions).toHaveLength(1);
  expect(submissions[0].draft).toContain('Luftqualität in der Klasse');
});
