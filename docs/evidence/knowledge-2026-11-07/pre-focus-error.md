# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visitors.spec.mjs >> Separate website origin: open the widget by keyboard, ask, close and resume
- Location: visitors.spec.mjs:124:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('forju-compass-widget').locator('.launcher')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" locator('forju-compass-widget').locator('.launcher') with timeout 5000ms
  - waiting for locator('forju-compass-widget').locator('.launcher')
    14 × locator resolved to <button type="button" class="launcher" title="Resume chat" aria-expanded="false" aria-label="Resume chat" aria-controls="compass-conversation">…</button>
       - unexpected value "inactive"

```

```yaml
- button "Resume chat"
```

# Test source

```ts
  97  |   await expect(follow.locator('.read-more a').first()).toHaveAttribute('href','https://forju.at/de/projects/schulworkshops');
  98  | });
  99  |
  100 | test('English: edit and copy an equipment email with the visitor’s month', async ({page, context, browserName, baseURL}, info) => {
  101 |   await page.goto('/embed?lang=en');
  102 |   const first = await ask(page, 'Our class wants to borrow a sensor to measure air quality in March. Where can we ask?');
  103 |   await expect(first.locator('a[href*="thema=ressourcen"]')).toBeVisible();
  104 |   const follow = await ask(page, 'Could you write a short email I can send them?');
  105 |   const answer = await follow.locator('.response p').innerText();
  106 |   expect.soft(answer, 'The visitor can use the draft').toMatch(/(?:hello|dear|hi)\b.{0,25}(?:forju|team)|subject\s*:/i);
  107 |   expect.soft(answer, 'Retain what the class wants to measure').toMatch(/air quality/i);
  108 |   expect.soft(answer, 'Retain the requested month').toMatch(/March/i);
  109 |   expect(answer, 'Keep the enquiry with the equipment team').not.toMatch(/presse@|press contact/i);
  110 |   await follow.getByRole('button',{name:'Edit draft'}).click();
  111 |   const edited = answer.replace('March','April');
  112 |   await follow.getByRole('textbox',{name:'Your email draft'}).fill(edited);
  113 |   await follow.getByRole('button',{name:'Done editing'}).click();
  114 |   const mail = new URL(await follow.getByRole('link',{name:'Open in email app'}).getAttribute('href'));
  115 |   expect(mail.pathname).toEqual('office@forju.at');
  116 |   expect(mail.searchParams.get('body')).toEqual(edited);
  117 |   if (browserName === 'chromium') await context.grantPermissions(['clipboard-read','clipboard-write'], {origin: baseURL});
  118 |   await follow.getByRole('button',{name:'Copy draft'}).click();
  119 |   await expect(follow.getByRole('status')).toContainText(/copied|selected/i);
  120 |   if (browserName === 'chromium') expect(await page.evaluate(()=>navigator.clipboard.readText())).toEqual(edited);
  121 |   await checkAccessibility(page,info);
  122 | });
  123 |
  124 | test('Separate website origin: open the widget by keyboard, ask, close and resume', async ({page,context,baseURL}) => {
  125 |   // The browser enforces real origin boundaries and the app’s production CSP.
  126 |   // Both HTTPS origins are fixtures: asset and chat traffic go to loopback.
  127 |   await page.setViewportSize({width:1366,height:850});
  128 |   const compassOrigin = 'https://compass.example.test';
  129 |   await context.route(compassOrigin+'/**',async route=>{
  130 |     const url=new URL(route.request().url());
  131 |     if (route.request().method()!=='GET' && !(route.request().method()==='POST' && url.pathname==='/api/chat')) return route.abort();
  132 |     const response = await route.fetch({url:baseURL+url.pathname+url.search, maxRedirects:0});
  133 |     await route.fulfill({response});
  134 |   });
  135 |   const preview='https://www.forju.at/visitor-preview';
  136 |   await page.route(preview, route => route.fulfill({contentType:'text/html',body:
  137 |     '<!doctype html><html lang="en"><title>Website preview</title><main style="min-height:300vh"><h1>Website preview</h1><button style="position:fixed;top:80px">Website action</button></main><script defer src="'+compassOrigin+'/compass-widget.js"></script></html>'}));
  138 |   await page.goto(preview);
  139 |   const host = page.locator('forju-compass-widget');
  140 |   const start = host.locator('.welcome .start');
  141 |   const launcher = host.locator('.launcher');
  142 |   await expect(start).toBeHidden();
  143 |   await launcher.hover();
  144 |   await expect(start).toBeHidden();
  145 |   await launcher.press('Enter');
  146 |   await expect(start).toBeFocused();
  147 |   await page.mouse.move(160,420);
  148 |   await page.mouse.wheel(0,360);
  149 |   await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  150 |   await start.press('Enter');
  151 |   const panel = host.frameLocator('iframe');
  152 |   const drawer = host.locator('.drawer');
  153 |   await expect(panel.locator('.suggestions')).toBeVisible();
  154 |   const compactWidth = (await drawer.boundingBox()).width;
  155 |   expect(compactWidth).toBe(430);
  156 |   const question = panel.getByRole('textbox',{name:'Your question'});
  157 |   await question.fill('Unsent classroom question');
  158 |   await host.getByRole('button',{name:'Expand chat',exact:true}).click();
  159 |   await expect.poll(async ()=>(await drawer.boundingBox()).width).toBeGreaterThan(compactWidth);
  160 |   await expect(question).toHaveValue('Unsent classroom question');
  161 |   const hostButton=page.getByRole('button',{name:'Website action'});
  162 |   await hostButton.click();
  163 |   await expect(hostButton).toBeFocused();
  164 |   await expect(drawer).toBeVisible();
  165 |   await host.getByRole('button',{name:'Restore compact chat',exact:true}).click();
  166 |   const beforePageScroll=await page.evaluate(()=>scrollY);
  167 |   await page.mouse.move(200,320);await page.mouse.wheel(0,320);
  168 |   await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(beforePageScroll);
  169 |   const first = await ask(panel, 'Which workshops are available for schools?');
  170 |   await expect(first.locator('a[href*="schulworkshops"]').first()).toBeVisible();
  171 |   // WebKit can deliver the tail of the preceding host wheel after the answer
  172 |   // renders. Measure the host at rest before testing scrolling inside the frame.
  173 |   const pageAt=await page.evaluate(()=>new Promise(resolve=>{
  174 |     let timer;
  175 |     function onScroll(){
  176 |       clearTimeout(timer);
  177 |       timer=setTimeout(()=>{window.removeEventListener('scroll',onScroll);resolve(window.scrollY)},150);
  178 |     }
  179 |     window.addEventListener('scroll',onScroll,{passive:true});
  180 |     onScroll();
  181 |   }));
  182 |   const log=panel.locator('.embed-log');
  183 |   const scrollBox=await log.boundingBox();
  184 |   await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  185 |   const bottom=await log.evaluate(el=>el.scrollTop);
  186 |   await page.mouse.move(scrollBox.x+scrollBox.width/2,scrollBox.y+scrollBox.height/2);
  187 |   await page.mouse.wheel(0,-200);
  188 |   await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBeLessThan(bottom);
  189 |   expect(await page.evaluate(()=>scrollY)).toBe(pageAt);
  190 |   const next = await ask(panel, 'How do I register my class for it?');
  191 |   await expect(next.locator('.response p')).toContainText('anja.hofer@forju.at');
  192 |   const email=await ask(panel, 'Could you draft an email?');
  193 |   await expect(email.getByRole('button',{name:'Edit draft'})).toBeVisible();
  194 |   await expect(email.getByRole('link',{name:'Open in email app'})).toHaveAttribute('href',/^mailto:anja\.hofer@forju\.at\?/);
  195 |   await page.keyboard.press('Escape');
  196 |   await expect(host.locator('.drawer')).toBeHidden();
> 197 |   await expect(host.locator('.launcher')).toBeFocused();
      |                                           ^ Error: expect(locator).toBeFocused() failed
  198 |   await page.keyboard.press('Enter');
  199 |   await expect(start).toBeHidden();
  200 |   await expect(panel.locator('[role=log] article')).toHaveCount(3);
  201 | });
  202 |
  203 | test('Accessibility: standalone chat with a German answer', async ({page},info) => {
  204 |   await page.goto('/embed?lang=de');
  205 |   await ask(page, 'Hallo');
  206 |   await checkAccessibility(page,info);
  207 | });
  208 |
  209 | test('Accessibility: mobile project draft open', async ({page},info) => {
  210 |   await page.setViewportSize({width:390,height:844});
  211 |   await page.goto('/embed?lang=en');
  212 |   await page.locator('html[lang=en]').waitFor();
  213 |   await page.getByRole('button',{name:/start a project draft/i}).click();
  214 |   await expect(page.getByRole('dialog')).toBeVisible();
  215 |   await checkAccessibility(page,info);
  216 | });
  217 |
  218 | test('Standalone homepage: turn a school workshop enquiry into a German email', async ({page}) => {
  219 |   await page.goto('/');
  220 |   const input = page.getByRole('textbox',{name:'Frage an ForJu Compass'});
  221 |   await input.fill('Kann unsere Klasse in Graz einen Workshop zum Klima machen?');
  222 |   await input.press('Enter');
  223 |   const turns = page.locator('.chat-turn');
  224 |   await expect(turns.first().locator('a[href="https://forju.at/de/projects/schulworkshops"]').first()).toBeVisible();
  225 |   await input.fill('Kannst du mir dafür eine E-Mail formulieren?');
  226 |   await input.press('Enter');
  227 |   const draft = turns.nth(1);
  228 |   await expect(draft.locator('.chat-answer')).toContainText('für unsere Klasse in Graz');
  229 |   await expect(draft.locator('.chat-answer')).toContainText('zum Klima');
  230 |   await expect(draft.getByRole('link',{name:'In Mail-App öffnen'})).toHaveAttribute('href',/^mailto:anja\.hofer@forju\.at\?/);
  231 | });
  232 |
  233 | test('stakeholder preview: launch the German widget and recover from an unrelated question', async ({page}) => {
  234 |   await page.setViewportSize({width:390,height:844});
  235 |   await page.goto('/preview');
  236 |   await expect(page.getByRole('heading', {level:1})).toContainText('ForJu Compass');
  237 |   const host = page.locator('forju-compass-widget');
  238 |   await host.getByRole('button', {name:'ForJu Compass: Chathilfe'}).click();
  239 |   await host.locator('.welcome .start').click();
  240 |   const panel = host.frameLocator('iframe');
  241 |   await expect(host.locator('.resize')).toBeHidden();
  242 |   await expect.poll(()=>host.locator('.drawer').evaluate(el=>el.matches(':modal'))).toBe(true);
  243 |   expect(await page.evaluate(()=>document.body.style.overflowY)).toBe('hidden');
  244 |   const turn = await ask(panel,'Wie viele Monde hat der Jupiter?');
  245 |   await expect(turn.locator('.read-more a')).toHaveCount(0);
  246 |   await turn.getByRole('button',{name:'Schulworkshops',exact:true}).click();
  247 |   const reply = panel.locator('[role=log] article').last();
  248 |   await expect(reply.locator('a[href="https://forju.at/de/projects/schulworkshops"]').first()).toBeVisible();
  249 |   await host.getByRole('button',{name:'Chat schließen'}).click();
  250 |   await expect(host.locator('.drawer')).toBeHidden();
  251 |   expect(await page.evaluate(()=>document.body.style.overflowY)).toBe('');
  252 |   await page.getByRole('link',{name:'EN',exact:true}).click();
  253 |   await expect(page.locator('html')).toHaveAttribute('lang','en');
  254 |   await expect(page.locator('a[href^="/embed"]')).toHaveCount(0);
  255 |   await expect(host.locator('.launcher')).toBeVisible();
  256 | });
  257 |
  258 | test('English mobile: correct what the class measures, accept a draft, then ask a person', async ({page})=>{
  259 |   await page.setViewportSize({width:390,height:844});
  260 |   await page.goto('/preview?lang=en');
  261 |   const host=page.locator('forju-compass-widget');
  262 |   await host.locator('.launcher').click();
  263 |   await host.locator('.welcome .start').click();
  264 |   const panel=host.frameLocator('iframe');
  265 |   await ask(panel,'Can our class borrow a sensor to measure air quality?');
  266 |   const corrected=await ask(panel,'Actually, not air quality but water quality.');
  267 |   await expect(corrected.locator('.response p')).toContainText('email draft');
  268 |   const draft=await ask(panel,'Yes please');
  269 |   const mail=new URL(await draft.getByRole('link',{name:'Open in email app'}).getAttribute('href'));
  270 |   expect(mail.pathname).toBe('office@forju.at');
  271 |   expect(mail.searchParams.get('body')).toMatch(/sensor to measure water quality/i);
  272 |   expect(mail.searchParams.get('body')).not.toMatch(/air quality/i);
  273 |   const handoff=await ask(panel,'Can I talk to a real person?');
  274 |   await expect(handoff.locator('a[href*="thema=ressourcen"]')).toBeVisible();
  275 | });
  276 |
  277 | test('a teacher can choose between two classroom needs and prepare an enquiry on a phone',async({page})=>{
  278 |   await page.setViewportSize({width:390,height:844});
  279 |   await page.goto('/preview');
  280 |   const host=page.locator('forju-compass-widget');
  281 |   await host.locator('.launcher').click();
  282 |   await host.locator('.welcome .start').click();
  283 |   const panel=host.frameLocator('iframe');
  284 |   const options=await ask(panel,'Meine Klasse hat Zoff und Prüfungsangst. Welche Workshops passen dazu?');
  285 |   await expect(options.getByRole('button',{name:/Konflikte/})).toBeVisible();
  286 |   const selected=await ask(panel,'den ersten');
  287 |   await expect(selected.locator('.response p')).toContainText('Streit');
  288 |   await expect(selected.locator('a[href$="/de/projects/schulworkshops"]')).toBeVisible();
  289 |   const contact=await ask(panel,'Wie melde ich meine Klasse dafür an?');
  290 |   await expect(contact.locator('.response p')).toContainText('anja.hofer@forju.at');
  291 |   const draft=await ask(panel,'Kannst du dafür eine E-Mail formulieren?');
  292 |   const mail=new URL(await draft.getByRole('link',{name:'In Mail-App öffnen'}).getAttribute('href'));
  293 |   expect(mail.pathname).toEqual('anja.hofer@forju.at');
  294 |   expect(mail.searchParams.get('body')).toContain('Konflikte');
  295 | });
  296 |
  297 | test('an English-speaking lab can offer equipment and prepare an email to the partnership contact',async({page})=>{
```
