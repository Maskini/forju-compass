import {z} from 'zod';
import {sha} from './extract.mjs';
const record=z.object({id:z.string().regex(/^[a-z0-9-]+$/),active:z.boolean(),page:z.literal(0),kind:z.enum(['public-website','public-social','planned']),title:z.string().min(1),titleEn:z.string().min(1),content:z.string().min(1),contentEn:z.string().min(1),keywords:z.string(),sourceUrl:z.url(),indexTitle:z.string().min(1),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/)}).passthrough();
export function validateCatalog(value){
 const rows=z.array(record).parse(value);const ids=new Set(),titles=new Set();
 for(const r of rows){
  const u=new URL(r.sourceUrl);if(u.protocol!=='https:'||u.username||u.password||!['forju.at','at.linkedin.com','de.linkedin.com','www.linkedin.com'].includes(u.hostname))throw Error('Unapproved provenance: '+r.id);
  if(ids.has(r.id)||titles.has(r.indexTitle))throw Error('Duplicate catalog identity');ids.add(r.id);titles.add(r.indexTitle);
  if(r.contentVersion===2 && r.sourceSha256!==catalogHash(r))throw Error('Edited content needs review/versioning: '+r.id);
 }
 return value;
}
export function catalogHash(row){
 // Include English, guided answers, contacts and links: all can change an answer.
 const ignored=new Set(['sourceSha256','indexTitle','lastReviewedAt','nextReviewAt','sourceContentHash','reviewStatus','contentVersion','active']);
 return sha(Object.fromEntries(Object.entries(row).filter(([k])=>!ignored.has(k)).sort(([a],[b])=>a.localeCompare(b))));
}
export function reviewCatalog(catalog,snapshot,ids,previous={},retire=[]){
 if(!ids.length&&!retire.length)throw Error('Select the records you actually reviewed');
 const state={...previous},selected=new Set(ids),retired=new Set(retire),known=new Set(catalog.map(c=>c.id));
 for(const id of [...ids,...retire])if(!known.has(id))throw Error('Unknown record '+id);
 const reviewedAt=snapshot.fetchedAt.slice(0,10);
 const updated=catalog.map(row=>{
  if(!selected.has(row.id)&&!retired.has(row.id))return row;
  const source=snapshot.pages.find(p=>p.url===row.sourceUrl);
  if(retired.has(row.id))return {...row,active:false};
  if(!source||source.status!=='ok')throw Error('Cannot approve missing, failed or redirected source: '+row.id);
  for(const url of [row.sourceUrl,row.sourceUrl.replace('/de','/en')]){
   const page=snapshot.pages.find(p=>p.url===url);if(!page||page.status!=='ok')throw Error('Review both language sources: '+row.id);
   const {url:pageUrl,language,title,dates,passages,forms,links}=page;
   if(page.contentHash!==sha({url:pageUrl,language,title,dates,passages,forms,links}))throw Error('Snapshot content changed after extraction');
   state[url]={...page,reviewedAt,status:'reviewed',recordHashes:{...state[url]?.recordHashes,[row.id]:page.contentHash}};
  }
  const next=new Date(snapshot.fetchedAt);next.setUTCDate(next.getUTCDate()+30);
  const r={...row,sourcePublishedAt:source.dates.published,sourceUpdatedAt:source.dates.modified,sourceContentHash:source.contentHash,contentVersion:2,lastReviewedAt:reviewedAt,nextReviewAt:next.toISOString().slice(0,10)};
  r.sourceSha256=catalogHash(r);r.indexTitle='forju-public:'+row.id+':'+r.sourceSha256.slice(0,12);return r;
 });
 return {catalog:validateCatalog(updated),state};
}
export function sourceChanges(catalog,pages,state){
 return pages.map(page=>{
  const affected=catalog.filter(r=>r.active&&(r.sourceUrl===page.url||r.sourceUrl.replace('/de','/en')===page.url)).map(r=>r.id);
  const pending=affected.filter(id=>state[page.url]?.recordHashes?.[id]!==page.contentHash);
  const change=page.status!=='ok'?page.status:!state[page.url]?'unreviewed':state[page.url].contentHash!==page.contentHash?'changed':pending.length?'partially-reviewed':'unchanged';
  return {url:page.url,status:page.status,change,affected,pending};
 });
}
