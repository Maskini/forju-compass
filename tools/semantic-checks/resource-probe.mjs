import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.env.SEMANTIC_WORK||resolve(import.meta.dirname,'../../work/semantic-benchmark');
const begin=performance.now();
const {env,pipeline}=await import(process.env.SEMANTIC_PACKAGE||'@huggingface/transformers');
env.allowRemoteModels=false;env.localModelPath=resolve(base,'models')+'/';env.useFSCache=false;
globalThis.fetch=()=>{throw Error('Network forbidden')};
const model=await pipeline('feature-extraction','multilingual-minilm',{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:1,interOpNumThreads:1,executionMode:'sequential',enableCpuMemArena:false}});
const loadMs=performance.now()-begin;
const timings=[];
for(const q of ['Wir brauchen Hilfe bei der Projektfinanzierung.','Can we borrow measuring equipment?','Unsere Klasse streitet jeden Tag.']){const t=performance.now();await model(q,{pooling:'mean',normalize:true,max_length:128,truncation:true});timings.push(performance.now()-t);}
const report={loadMs,timings,rss:process.memoryUsage().rss,maxRSSBytes:process.resourceUsage().maxRSS*1024};
try{report.cgroupPeak=Number(readFileSync('/sys/fs/cgroup/memory.peak','utf8'));report.memoryEvents=readFileSync('/sys/fs/cgroup/memory.events','utf8')}catch{}
writeFileSync(resolve(base,'resource-probe.json'),JSON.stringify(report,null,2));console.log(report);await model.dispose();
