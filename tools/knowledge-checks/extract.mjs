import {Readability} from '@mozilla/readability';
import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
const clean=s=>s.replace(/\s+/gu,' ').trim();
export const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function extractPage(html,url){
 // Default JSDOM runs no scripts and loads no subresources. Never enable either.
 const dom=new JSDOM(html,{url});let articleDom;
 try{
  const doc=dom.window.document;
  for(const el of doc.querySelectorAll('[aria-hidden="true"]'))el.remove();
  const title=clean(doc.querySelector('h1')?.textContent||doc.title);
  const language=doc.documentElement.lang.toLowerCase().startsWith('en')?'en':'de';
  const main=doc.querySelector('main');if(!main)throw Error('Missing main content; review extraction');
  const dates={published:null,modified:null};
  function visit(value,depth=0){if(!value||typeof value!=='object'||depth>8)return;for(const [key,item] of Object.entries(value)){if(['datePublished','dateModified'].includes(key)&&typeof item==='string')dates[key==='datePublished'?'published':'modified']=item;if(typeof item==='object')visit(item,depth+1)}}
  for(const script of doc.querySelectorAll('script[type="application/ld+json"]')){try{visit(JSON.parse(script.textContent))}catch{}}
  const forms=[...main.querySelectorAll('form')].map(form=>[...form.querySelectorAll('input,textarea,select')].filter(e=>!['hidden','submit','button'].includes(e.type)&&!e.closest('[hidden],[aria-hidden="true"]')&&!/leave (?:this )?blank|bitte leer lassen/i.test([...(e.labels||[])].map(l=>l.textContent).join(' '))).map(e=>({
   label:clean([...(e.labels||[])].map(l=>l.textContent).join(' ')||e.getAttribute('aria-label')||e.name),
   name:e.name,type:e.type,required:e.required
  }))).filter(f=>f.length);
  // Related-article recommendations are not evidence for this offer.
  for(const h of main.querySelectorAll('h2,h3'))if(/^(Empfohlene Artikel|Recommended articles)$/i.test(clean(h.textContent))){let n=h;while(n){const next=n.nextElementSibling;n.remove();n=next}}
  // Capture actionable public links even when the article extractor drops its CTA.
  const links=[...new Map([...main.querySelectorAll('a[href]')].flatMap(a=>{
   try{const u=new URL(a.getAttribute('href'),url);return (u.protocol==='mailto:'||u.origin==='https://forju.at')?[[u.href,{url:u.href,label:clean(a.textContent)}]]:[]}catch{return []}
  })).values()];
  for(const e of doc.querySelectorAll('script,style,nav,header,footer,button,iframe,svg,noscript'))e.remove();
  for(const br of main.querySelectorAll('br'))br.replaceWith(' ');
  for(const strong of main.querySelectorAll('strong'))strong.after(' ');
  const article=new Readability(doc.cloneNode(true),{charThreshold:80}).parse();
  if(article?.content)articleDom=new JSDOM(article.content);
  // Readability can discard card grids (jobs/team). Keep the approved main
  // when its article would omit over 20% of the public text.
  const useArticle=articleDom&&!forms.length&&clean(article.textContent).length>=clean(main.textContent).length*.8;
  const chosen=useArticle?articleDom.window.document.body:main;
  const blocks=[];let headings=[title],bodyCharacters=0;
  const selector='h1,h2,h3,h4,p,li,dt,dd,blockquote,div,address,section';
  for(const el of chosen.querySelectorAll(selector)){
   if(el.querySelector(selector))continue;
   const text=clean(el.textContent);if(!text)continue;
   if(/^H[1-4]$/.test(el.tagName)){const level=Number(el.tagName[1]);headings=headings.slice(0,level-1);headings[level-1]=text;blocks.push({heading:headings.filter(Boolean).join(' › '),text});continue}
   bodyCharacters+=text.length;
   // Bound passages without cutting away the remaining part of a long paragraph.
   const chunks=text.match(/.{1,1100}(?:\s|$)|\S{1,1100}/gu)||[];
   for(const chunk of chunks)blocks.push({heading:headings.filter(Boolean).join(' › '),text:chunk.trim()});
  }
  if(!blocks.length&&clean(chosen.textContent).length>30)blocks.push({heading:title,text:clean(chosen.textContent).slice(0,1500)});
  if(!title||!blocks.length||(bodyCharacters<30&&!forms.length))throw Error('Insufficient public body text; inspect the rendered page before approving');
  const content={url,language,title,dates,passages:blocks,forms,links};
  return {...content,contentHash:sha(content),extractor:useArticle?'mozilla-readability':'structured-main-fallback',reviewStatus:'pending-human-review'};
 }finally{articleDom?.window.close();dom.window.close()}
}
export function approvedUrl(value,manifest){
 const u=new URL(value);
 if(u.origin!=='https://forju.at'||u.username||u.password||u.hash||!manifest.includes(u.href))throw Error('URL is outside the exact public allowlist');
 return u.href;
}
export async function fetchPage(url,manifest,fetcher=fetch){
 const original=approvedUrl(url,manifest);let current=original;
 for(let i=0;i<4;i++){
  const res=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'user-agent':'ForJuCompass-public-review/2.0','accept':'text/html'}});
  if([301,302,303,307,308].includes(res.status)){current=approvedUrl(new URL(res.headers.get('location'),current).href,manifest);continue}
  if([404,410].includes(res.status))return {url:original,status:'removed',httpStatus:res.status};
  if(!res.ok)throw Error('HTTP '+res.status);
  if(!res.headers.get('content-type')?.includes('text/html'))throw Error('Expected public HTML');
  const reader=res.body.getReader();let bytes=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000)throw Error('Public page exceeds 2 MB limit');chunks.push(value)}}finally{await reader.cancel()}
  const page=extractPage(Buffer.concat(chunks).toString('utf8'),original);
  return {...page,resolvedUrl:current,status:current===original?'ok':'redirected',httpStatus:res.status};
 }
 throw Error('Too many redirects');
}
