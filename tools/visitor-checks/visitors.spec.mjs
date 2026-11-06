import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ context, baseURL }) => {
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

test('German on mobile: answer whether a Vienna workshop is available in Graz', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/embed?lang=de');
  const first = await ask(page, 'Wir sind eine Klasse aus Graz und möchten einen Schulworkshop zum Klima. Geht das bei uns auch?');
  await expect(first.locator('.read-more a').first()).toHaveAttribute('href','https://forju.at/de/projects/schulworkshops');
  const follow = await ask(page, 'Heißt das, ihr kommt auch nach Graz?');
  const answer = await follow.locator('.response p').innerText();
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
  const compassOrigin = 'https://compass.example.test';
  await context.route(compassOrigin+'/**',async route=>{
    const url=new URL(route.request().url());
    if (route.request().method()!=='GET' && !(route.request().method()==='POST' && url.pathname==='/api/chat')) return route.abort();
    const response = await route.fetch({url:baseURL+url.pathname+url.search, maxRedirects:0});
    await route.fulfill({response});
  });
  const preview='https://www.forju.at/visitor-preview';
  await page.route(preview, route => route.fulfill({contentType:'text/html',body:
    '<!doctype html><html lang="en"><title>Website preview</title><main><h1>Website preview</h1></main><script defer src="'+compassOrigin+'/compass-widget.js"></script></html>'}));
  await page.goto(preview);
  const host = page.locator('forju-compass-widget');
  const start = host.locator('.welcome .start');
  await start.focus();
  await page.keyboard.press('Enter');
  const panel = host.frameLocator('iframe');
  const first = await ask(panel, 'Which workshops are available for schools?');
  await expect(first.locator('a[href*="schulworkshops"]').first()).toBeVisible();
  const next = await ask(panel, 'How do I register my class for it?');
  await expect(next.locator('.response p')).toContainText('anja.hofer@forju.at');
  const email=await ask(panel, 'Could you draft an email?');
  await expect(email.getByRole('button',{name:'Edit draft'})).toBeVisible();
  await expect(email.getByRole('link',{name:'Open in email app'})).toHaveAttribute('href',/^mailto:anja\.hofer@forju\.at\?/);
  await page.keyboard.press('Escape');
  await expect(host.locator('.drawer')).toBeHidden();
  await expect(host.locator('.launcher')).toBeFocused();
  await page.keyboard.press('Enter');
  await start.press('Enter');
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
