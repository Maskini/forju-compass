// Live AI/browser check. Synthetic visitors on a browser-only host preview;
// never installs code on the public ForJu site. Requires the isolated :4197 app.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium,expect}=createRequire(new URL('../visitor-checks/package.json',import.meta.url))('@playwright/test');
if(!process.argv.includes('--live'))throw Error('Pass --live to authorize the four synthetic API questions.');
const base='http://127.0.0.1:4197',frameOrigin='https://compass-preview.test',hostOrigin='https://www.forju.at';
const out=resolve('work/assistant-checks/browser');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{
 for(const mobile of [false,true]){
  const lang=mobile?'en':'de';const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,locale:lang,serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===hostOrigin&&url.pathname==='/compass-ai-preview'){
    const html=await (await context.request.get(base+'/preview?lang='+lang)).text();
    return route.fulfill({contentType:'text/html',body:html.replace('src="/compass-widget.js"','src="'+frameOrigin+'/compass-widget.js"')});
   }
   if(url.origin===frameOrigin||url.origin===hostOrigin){
    if(req.method()!=='GET'&&!(url.origin===frameOrigin&&url.pathname==='/api/chat'&&req.method()==='POST'))return route.abort();
    const response=await context.request.fetch(base+url.pathname+url.search,{method:req.method(),data:req.postDataBuffer()??undefined,headers:{'content-type':req.headers()['content-type']||'text/plain','accept-language':lang}});
    return route.fulfill({response});
   }
   // A supporting link may be read, with no form submissions or analytics.
   if(url.hostname==='forju.at'&&['GET','HEAD'].includes(req.method()))return route.continue();
   return route.abort();
  });
  const page=await context.newPage();page.setDefaultTimeout(25000);
  await page.goto(hostOrigin+'/compass-ai-preview');const widget=page.locator('forju-compass-widget');
  await widget.locator('.launcher').click();await widget.locator('.welcome .start').click();
  const panel=page.frameLocator('forju-compass-widget iframe');
  const questions=mobile?['Hi, we want to measure the air in our classroom. Could we borrow a sensor?','What would that cost us?']:['Welche Workshops bietet ihr für Schulen an?','Und wie melde ich meine Klasse dafür an?'];
  const answers=[];
  for(const q of questions){
   const input=panel.getByRole('textbox',{name:mobile?'Your question':'Deine Frage',exact:true});
   await input.fill(q);const pending=page.waitForResponse(r=>r.url()===frameOrigin+'/api/chat'&&r.request().method()==='POST');await input.press('Enter');
   const response=await pending;expect(response.headers()['x-compass-answer-mode']).toBe('openai');const body=await response.json();answers.push({question:q,...body});
   await expect(panel.locator('[role=log] article').last().locator('.response')).toContainText(body.answer.split('\n')[0]);
  }
  const link=panel.locator('[role=log] article').last().locator('.read-more a').first();
  const href=await link.getAttribute('href');expect(href).toContain(mobile?'/services/ressourcen':'/projects/schulworkshops');
  await page.screenshot({path:out+'/'+(mobile?'mobile':'desktop')+'.png'});
  const popupPromise=context.waitForEvent('page');await link.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');expect(popup.url()).toBe(href);await expect(popup.locator('h1').first()).toContainText(mobile?/Resources|Ressourcen/i:/Schulworkshops|School workshops/i);await popup.close();
  await widget.getByRole('button',{name:mobile?'Close chat':'Chat schließen',exact:true}).click();await expect(widget.locator('.launcher')).toBeFocused();
  await widget.locator('.launcher').click();await expect(panel.locator('[role=log] article')).toHaveCount(2);
  results.push({surface:'separate-origin browser-only preview',viewport:mobile?'390x844':'1440x900',language:lang,answers,sourceOpened:href,reopened:true});await context.close();
 }
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2)+'\n')}
console.log(JSON.stringify({passed:results.length,evidence:out}));
