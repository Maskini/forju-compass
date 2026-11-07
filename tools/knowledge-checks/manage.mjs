import {readFileSync,writeFileSync,mkdirSync,renameSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fetchPage} from './extract.mjs';
import {validateCatalog,reviewCatalog,sourceChanges} from './catalog.mjs';
const root=resolve(import.meta.dirname,'../..'),cat=join(root,'knowledge/catalog.json'),statePath=join(root,'knowledge/source-review.json'),work=join(root,'work/source-review');
const load=p=>JSON.parse(readFileSync(p,'utf8')),save=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const manifest=load(join(root,'knowledge/public-sources.json'));
const state=existsSync(statePath)?load(statePath):{},catalog=load(cat),args=process.argv.slice(2),command=args[0];
const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
mkdirSync(work,{recursive:true});
if(command==='refresh'){
 const pages=[];const fetchedAt=new Date().toISOString();
 for(const url of manifest){
  try{pages.push(await fetchPage(url,manifest))}catch(error){pages.push({url,status:'unavailable',error:error.message})}
  console.log(pages.at(-1).status,url);await new Promise(r=>setTimeout(r,120));
 }
 const report={fetchedAt,peakRssKiB:process.resourceUsage().maxRSS,pages,changes:sourceChanges(catalog,pages,state),manualSources:catalog.filter(r=>r.active&&r.kind==='public-social').map(r=>({id:r.id,url:r.sourceUrl,lastReviewedAt:r.lastReviewedAt}))};
 const dir=join(work,fetchedAt.replace(/[:.]/g,'-'));mkdirSync(dir);save(join(dir,'snapshot.json'),report);save(join(work,'latest.json'),{snapshot:join(dir,'snapshot.json')});
 console.log('Review snapshot:',join(dir,'snapshot.json'));console.log('Changed/unreviewed:',report.changes.filter(r=>r.change!=='unchanged').length);
}else if(command==='review'){
 const snapshotPath=option('--snapshot')||load(join(work,'latest.json')).snapshot,snapshot=load(snapshotPath);
 const ids=(option('--ids')||'').split(',').filter(Boolean),retire=(option('--retire')||'').split(',').filter(Boolean);
 const result=reviewCatalog(catalog,snapshot,ids,state,retire),backup=join(work,'backup-'+new Date().toISOString().replace(/[:.]/g,'-'));
 mkdirSync(backup);copyFileSync(cat,join(backup,'catalog.json'));if(existsSync(statePath))copyFileSync(statePath,join(backup,'source-review.json'));
 save(cat+'.tmp',result.catalog);save(statePath+'.tmp',result.state);renameSync(cat+'.tmp',cat);renameSync(statePath+'.tmp',statePath);
 console.log('Reviewed:',ids.join(', '),'Retired:',retire.join(', '),'Backup:',backup);
}else if(command==='check'){
 validateCatalog(catalog);const due=catalog.filter(r=>r.active&&r.nextReviewAt&&r.nextReviewAt<new Date().toISOString().slice(0,10));
 console.log('Valid public records:',catalog.filter(r=>r.active).length,'Due for review:',due.map(r=>r.id).join(', ')||'none');
 if(existsSync(join(work,'latest.json'))){const snapshot=load(load(join(work,'latest.json')).snapshot),pending=sourceChanges(catalog,snapshot.pages,state).filter(c=>c.affected.length&&c.change!=='unchanged');
  console.log('Pending source checks:',JSON.stringify(pending,null,2));if(pending.length)process.exitCode=1;
 }
}else throw Error('Use refresh, review --ids id1,id2 [--snapshot path] [--retire id], or check');
