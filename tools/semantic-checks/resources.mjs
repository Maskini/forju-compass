import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'work/semantic-benchmark');mkdirSync(out,{recursive:true});
const run=(...args)=>execFileSync('docker',args,{encoding:'utf8'}).trim();
const endpoint=process.env.DOCKER_HOST||run('context','inspect','--format','{{.Endpoints.docker.Host}}');
if(!endpoint.startsWith('unix://'))throw Error('Use local Docker only');
// The bootstrap only downloads public pinned tools. No fixtures run with network access.
const image=run('build','-q',import.meta.dirname);
const box=run('create','--network','none','--memory','512m','--memory-swap','512m','--cpus','.1','-v',out+':/experiment',image);
let timedOut=false,state;
try{
 run('start',box);
 for(let seconds=0;seconds<120;seconds++){
  state=JSON.parse(run('inspect',box))[0].State;if(!state.Running)break;
  await new Promise(r=>setTimeout(r,1000));
 }
 state=JSON.parse(run('inspect',box))[0].State;
 if(state.Running){timedOut=true;run('stop','-t','1',box);state=JSON.parse(run('inspect',box))[0].State;}
 const result={budgetBytes:536870912,cpus:.1,network:'none',swapDisabled:true,modelOnly:true,appIncluded:false,timedOut,state,
   result:state.ExitCode===0&&!timedOut?'Model-only probe completed; still requires combined app capacity and quality checks':'REJECT: model does not fit the existing hosting gate'};
 writeFileSync(resolve(out,'resource-limit.json'),JSON.stringify(result,null,2)+'\n');
 writeFileSync(resolve(out,'resource-probe.log'),run('logs',box));
 console.log(JSON.stringify(result,null,2));
 if(state.ExitCode!==0||timedOut)process.exitCode=1;
}finally{run('rm','-f',box);}
