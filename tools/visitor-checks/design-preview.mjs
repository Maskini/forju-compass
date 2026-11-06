// Install the real embed only in this disposable browser context. The public host receives no writes.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const origin = new URL(process.env.COMPASS_DESIGN_ORIGIN || 'http://127.0.0.1:4262');
if (!['localhost', '127.0.0.1'].includes(origin.hostname)) throw Error('Start a local Compass server first.');
const preview = 'https://compass-preview.test';
const article = 'https://forju.at/de/projects/schulworkshops';
const capture = process.argv.slice(2).find(arg=>!arg.startsWith('--'));
if (capture && !['before','after'].includes(capture)) throw Error('Use before, after or no argument for an interactive preview.');
const output = resolve(process.env.COMPASS_DESIGN_OUTPUT || 'work/design-review');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({ channel: process.env.COMPASS_CHROME || 'chrome', headless: false });
const evidence = {};
try {
  for (const phone of capture ? [false,true] : [process.argv.includes('--phone')]) {
    const device = phone ? 'phone' : 'desktop';
    const context = await browser.newContext({viewport:phone?{width:390,height:844}:{width:1440,height:900},
      locale:'de-AT', reducedMotion:'reduce', hasTouch:phone, isMobile:phone, serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const request = route.request(), url = new URL(request.url());
      const read = ['GET','HEAD'].includes(request.method());
      if (url.origin !== preview) return read ? route.continue() : route.abort();
      if (!read && !(url.pathname === '/api/chat' && request.method() === 'POST')) return route.abort();
      // Never forward host cookies or authorization to the local test server.
      const response = await context.request.fetch(new URL(url.pathname+url.search, origin).href,{
        method:request.method(), data:request.postDataBuffer() ?? undefined,
        headers:{'content-type':request.headers()['content-type'] || 'text/plain'},
      });
      return route.fulfill({response});
    });
    if (!capture) await context.addInitScript(({origin})=>{
      if (window !== top || location.hostname !== 'forju.at') return;
      addEventListener('DOMContentLoaded',()=>{
        const script=document.createElement('script');
        script.src=origin+'/compass-widget.js';
        document.body.append(script);
        document.title='Website-Vorschau · '+document.title;
      },{once:true});
    },{origin:preview});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(article, {waitUntil:'load',timeout:90000});
    await page.locator('main img[alt="Schulworkshops"]').first().evaluate(img=>img.decode());
    await page.evaluate(()=>document.fonts.ready);
    const hostStyles=()=>page.locator('header,main h1,main a[href="#article-body"]').evaluateAll(els=>els.map(e=>{
      const s=getComputedStyle(e), r=e.getBoundingClientRect();
      return [s.fontFamily,s.fontSize,s.color,s.backgroundColor,s.position,r.x,r.y,r.width,r.height];
    }));
    const initialStyles=await hostStyles();
    if(capture) await page.addScriptTag({url:preview+'/compass-widget.js'});
    const host = page.locator('forju-compass-widget');
    const launcher = host.locator('.launcher');
    await launcher.waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const shot = name=>page.screenshot({path:join(output,capture+'-'+device+'-'+name+'.png'),animations:'disabled'});
    if (!capture) {
      console.log('Browser-only ForJu preview. Project and feedback delivery are blocked. Close the browser to finish.');
      await new Promise(done=>{
        page.once('close',done);
        browser.once('disconnected',done);
      });
      break;
    }
    const log = evidence[device] = {};
    assert.deepEqual(await hostStyles(),initialStyles);log.hostTypographyAndGeometry=true;
    log.visibleConsent = await page.locator('dialog[open]:visible,[aria-modal="true"]:visible,[id*="cookie" i]:visible,[id*="consent" i]:visible').allTextContents();
    const heading=page.locator('main h1').first();
    const layout=()=>heading.evaluate(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.clientWidth}));
    const baseline=await layout();
    const viewportHeight=await page.evaluate(()=>innerHeight);
    await shot('launcher');
    if (capture === 'after' && !phone) {
      const style=()=>launcher.evaluate(e=>{
        const s=getComputedStyle(e);
        return {width:e.offsetWidth,radius:s.borderRadius,font:s.fontFamily,background:s.backgroundColor,shadow:s.boxShadow,transform:s.transform};
      });
      const rest=await style();
      assert.equal(rest.radius,'16px');
      await launcher.hover();await expect.poll(async()=>(await style()).background).toBe('rgb(255, 231, 245)');
      const hover=await style();
      await page.mouse.down();await expect.poll(async()=>(await style()).transform).toBe('matrix(1, 0, 0, 1, 0, 1)');
      const pressed=await style();
      await page.mouse.move(20,90);await page.mouse.up();
      assert(rest.width===hover.width && hover.width===pressed.width);log.launcher={rest,hover,pressed};
    }
    if(phone){
      const menu=page.locator('header').getByRole('button',{name:/Menü öffnen|Open menu/i}).first();
      await menu.tap();
      const projects=page.locator('header a[href$="/projects"]:visible').first();
      await projects.waitFor();assert(await projects.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
      log.mobileMenu=true;await page.locator('header button[aria-expanded=true]').last().tap();
    }
    await launcher.focus();await page.keyboard.press('Enter');
    await host.locator('.start:visible').first().waitFor();
    await shot('welcome');
    await host.locator('.welcome .start').click();
    const frame=host.frameLocator('iframe'), question=frame.getByRole('textbox',{name:'Deine Frage'});
    await question.waitFor();
    if(capture==='after' && !phone){
      const services=page.locator('header').getByRole('button',{name:/Service-Untermenü/});
      await services.focus();await page.keyboard.press('Enter');await expect(services).toHaveAttribute('aria-expanded','true');
      await page.keyboard.press('Escape');await expect(services).toHaveAttribute('aria-expanded','false');
      log.hostMenuWithChat=true;
    }
    await question.fill('Welche Workshops bietet ihr für Schulen an?');await question.press('Enter');
    const answer=frame.locator('article').first();await answer.locator('.read-more a').first().waitFor();
    await question.evaluate(e=>e.blur());
    await answer.evaluate(e=>{const log=e.closest('.embed-log');log.scrollTop+=e.getBoundingClientRect().top-log.getBoundingClientRect().top-6});
    await shot('chat');
    log.workshopLinks=await answer.locator('.read-more a').evaluateAll(els=>els.map(a=>a.href));
    assert(log.workshopLinks.some(u=>u.includes('schulworkshops')));
    await answer.locator('.read-more a').first().evaluate(e=>{
      const log=e.closest('.embed-log');
      log.scrollTo({top:log.scrollTop+e.getBoundingClientRect().top-log.getBoundingClientRect().top-log.clientHeight*.56,behavior:'instant'});
    });
    await shot('source');
    if(capture==='after'){
      const [reader]=await Promise.all([
        page.waitForEvent('popup'),
        answer.locator('.read-more a').first().click(),
      ]);
      await reader.waitForURL('https://forju.at/de/projects/schulworkshops');
      await expect(reader.locator('main h1')).toHaveText('Schulworkshops');
      log.readerOpened=reader.url();await reader.close();await page.bringToFront();
      await expect.poll(()=>page.evaluate(()=>document.visibilityState)).toBe('visible');
    }
    if(!phone){
      await page.mouse.move(160,650);await page.mouse.wheel(0,320);await page.waitForTimeout(400);
      log.hostScrollWithChat=await page.evaluate(()=>scrollY);assert(log.hostScrollWithChat>0);
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    }else{
      await question.focus();
      // A keyboard reduces the available height while the physical screen stays the same size.
      const cdp=await context.newCDPSession(page);
      const resize=height=>cdp.send('Emulation.setDeviceMetricsOverride',{
        width:390,height,screenWidth:390,screenHeight:viewportHeight,deviceScaleFactor:1,mobile:true,
      });
      await resize(482);
      await question.fill('Unsere Klasse untersucht Wasser im Schulteich für unser Projekt.');
      await expect.poll(async()=>{const b=await question.boundingBox();return b && b.y>=0 && b.y+b.height<=482;}).toBe(true);
      log.composerAtReducedHeight=await question.boundingBox();
      await resize(viewportHeight);
      await expect.poll(()=>host.locator('iframe').evaluate(e=>Math.round(e.getBoundingClientRect().height))).toBe(viewportHeight);
    }
    await frame.locator('.report-inline').click();
    await frame.locator('#feedback-description').fill('Beispiel für diese Vorschau.');
    await frame.locator('.feedback-drawer').evaluate(el=>el.scrollTo(0,0));
    await shot('report');
    if(capture==='after'){
      await frame.locator('.feedback-type').first().click();
      await frame.locator('#feedback-email').fill('beispiel');
      await frame.locator('.feedback-submit').click();
      await expect(frame.locator('#feedback-email')).toBeFocused();
      await expect(frame.locator('#feedback-email-error')).toBeVisible();
      log.invalidReportFocused=true;
    }
    await frame.locator('.feedback-close').click();
    const idea='Unsere Klasse untersucht Wasser im Schulteich für unser Projekt.';
    await question.fill(idea);await question.press('Enter');
    await frame.locator('article').nth(1).waitFor();
    const draft=frame.locator('.project-draft dialog');
    await frame.locator('.draft-launch').click();await draft.locator('.draft-field textarea').first().waitFor();
    const title=draft.getByLabel('Projekttitel');assert.match(await draft.locator('.draft-field textarea').first().inputValue(),/Schulteich/);
    await title.fill('Wasser im Schulteich');await draft.getByRole('checkbox',{name:'Forschendes Lernen fördern'}).check();
    await draft.locator('.draft-layout').evaluate(el=>el.scrollTo(0,0));await draft.locator('.draft-banner h3').focus();
    await shot('project');
    if(capture==='before'){await context.close();continue;}
    await draft.getByRole('button',{name:/^Weiter/}).click();await draft.locator('.draft-banner h3').filter({hasText:'Zielgruppe'}).waitFor();
    await draft.locator('.draft-dismiss').click();
    await host.locator('.drawer:not([data-draft])').waitFor();
    await frame.locator('.draft-launch').click();await draft.locator('[aria-current=step]').filter({hasText:'Zielgruppe'}).waitFor();
    await draft.getByRole('button',{name:/Idee & Zielsetzung/}).click();assert.equal(await title.inputValue(),'Wasser im Schulteich');
    await draft.locator('.draft-dismiss').click();log.draftResumed=true;
    await host.locator('.close').click();await expect(launcher).toBeFocused();
    assert.equal(await launcher.evaluate(e=>e.matches(':focus')),true);
    const restored=await layout();assert(Math.abs(restored.y-baseline.y)<2 && restored.width===baseline.width);
    log.hostLayoutRestored=true;log.launcherFocused=true;
    await page.evaluate(()=>scrollTo({top:280,behavior:'instant'}));
    const place=await page.evaluate(()=>scrollY);
    await launcher.click();
    log.pointerReopened = await host.locator('.drawer').evaluate(e=>e.open);
    assert(log.pointerReopened);
    await frame.locator('article').nth(1).waitFor();await host.locator('.close').click();
    log.exchangePreserved=true;
    assert.equal(await page.evaluate(()=>scrollY),place);log.restoredArticleOffset=place;
    await page.locator('main a[href="#article-body"]').first().click();log.continuedBrowsing=page.url();assert(log.continuedBrowsing.endsWith('#article-body'));
    // Follow the site's own navigation with the widget minimized, then resume the draft.
    const header=page.locator('header').first();
    if(phone) await header.getByRole('button',{name:/Menü öffnen|Open menu/i}).tap();
    await header.locator('a[href$="/projects"]:visible').first().click();
    await page.waitForURL('**/de/projects');
    await launcher.click();await frame.locator('.draft-launch').click();
    assert.equal(await title.inputValue(),'Wasser im Schulteich');
    log.resumedOnProjectIndex=page.url();
    await context.close();
  }
} finally {
  if(capture) await writeFile(join(output,capture+'-journey.json'),JSON.stringify(evidence,null,2));
  await browser.close();
}
