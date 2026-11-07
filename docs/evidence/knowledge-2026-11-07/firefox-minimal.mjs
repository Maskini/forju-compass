import {chromium,firefox,webkit} from '/app/tools/visitor-checks/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';
console.log('Playwright',JSON.parse(readFileSync('/app/tools/visitor-checks/node_modules/playwright/package.json')).version);
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 const page=await browser.newPage();
 await page.setContent('<span id="l">Save</span><button id="b" aria-labelledby="l"></button>');
 try {
  await page.evaluate(()=>{void document.getElementById('b').ariaLabelledByElements});
  await page.getByRole('button',{name:'Save'}).click({trial:true,timeout:5000});
  console.log(name,'PASS');
 }catch(e){console.log(name,'FAIL',e.message.split('\n')[0]);}
 await browser.close();
}
