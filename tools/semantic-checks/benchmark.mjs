// Maintainer-only experiment: approved catalog + synthetic questions, local files only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';
import MiniSearch from 'minisearch';
const root=resolve(import.meta.dirname,'../..'), out=resolve(root,'work/semantic-benchmark');
const catalog=JSON.parse(readFileSync(resolve(root,'knowledge/catalog.json')));
const exports={};
new Function('require','exports',ts.transpileModule(readFileSync(resolve(root,'lib/knowledge.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>id==='minisearch'?MiniSearch:catalog,exports);
const cases=JSON.parse(readFileSync(resolve(import.meta.dirname,'cases.json'))).filter(c=>process.argv.includes('--holdout')?c.holdout:!c.holdout);
const phase=process.argv.includes('--holdout')?'holdout':'development';
const started=performance.now();
const {pipeline,env}=await import('@huggingface/transformers');
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=resolve(out,'models')+'/';env.useFSCache=false;
globalThis.fetch=()=>{throw Error('Network forbidden during semantic evaluation')};
const model=await pipeline('feature-extraction','multilingual-minilm',{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:1,interOpNumThreads:1,executionMode:'sequential',enableCpuMemArena:false}});
const readyMs=performance.now()-started;
const embed=async text=>Array.from((await model(text,{pooling:'mean',normalize:true,truncation:true,max_length:128})).data);
const passages=exports.knowledgeCatalog.flatMap(e=>[{id:e.id,text:e.title+'. '+e.content},{id:e.id,text:e.titleEn+'. '+e.contentEn}]);
const indexPath=resolve(out,'vectors.json');let vectors;
try{vectors=JSON.parse(readFileSync(indexPath));if(JSON.stringify(vectors.map(v=>v.text))!==JSON.stringify(passages.map(v=>v.text)))throw Error('Stale');}
catch{vectors=[];for(const p of passages)vectors.push({...p,vector:await embed(p.text)});writeFileSync(indexPath,JSON.stringify(vectors));}
const timings=[],results=[];
for(const c of cases){
 const q=c.turns[0],begin=performance.now(),vector=await embed(q);timings.push(performance.now()-begin);
 const scored=new Map();for(const p of vectors){const similarity=vector.reduce((sum,x,i)=>sum+x*p.vector[i],0);if(!scored.has(p.id)||scored.get(p.id)<similarity)scored.set(p.id,similarity);}
 const top=[...scored.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,score])=>({id,score}));
 const lexical=exports.selectCatalogKnowledge(exports.localKnowledge(q),q)[0]?.id??null;
 results.push({id:c.id,question:q,topics:c.turns.length===1?c.topics:null,lexical,semantic:top});
 console.log(JSON.stringify(results.at(-1)));
}
const report={phase,mode:'local synthetic retrieval probe; multi-turn scoring is done separately through /api/chat',readyMs,peakRssBytes:process.resourceUsage().maxRSS*1024,p95Ms:timings.sort((a,b)=>a-b)[Math.ceil(timings.length*.95)-1],results};
mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'retrieval-'+phase+'.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined}));await model.dispose();
