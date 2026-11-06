import {defineConfig} from '@playwright/test';
export default defineConfig({
  testMatch:['visitors.spec.mjs','release.spec.mjs'],workers:1,retries:0,timeout:50000,
  outputDir:'/out/playwright-results',reporter:[['list'],['json',{outputFile:'/out/playwright.json'}]],
  use:{baseURL:'http://127.0.0.1:4196',ignoreHTTPSErrors:true,serviceWorkers:'block',screenshot:'only-on-failure'},
  projects:[
    ...['chromium','firefox','webkit'].map(browserName=>({name:browserName,use:{browserName,viewport:{width:1280,height:800}}})),
    {name:'mobile-webkit',testMatch:'release.spec.mjs',use:{browserName:'webkit',isMobile:true,hasTouch:true,viewport:{width:390,height:844}}}
  ]
});
