// Optional diagnostic for SYNTHETIC local trials only. Never load in production.
// Node --require preload must be CommonJS; this is development-only tooling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs=require('node:fs');
if(process.env.COMPASS_CAPTURE_SYNTHETIC!=='1')throw Error('Synthetic capture requires explicit opt-in');
const original=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const response=await original(...args);
 const url=String(args[0]?.url||args[0]);
 if(url==='https://api.openai.com/v1/responses'){
  try{const data=await response.clone().json();fs.mkdirSync('work/assistant-checks',{recursive:true});
   fs.appendFileSync('work/assistant-checks/synthetic-provider.jsonl',JSON.stringify({status:data.status,usage:data.usage,output:data.output?.filter(item=>item.type==='message')})+'\n',{mode:0o600});
  }catch{}
 }
 return response;
};
