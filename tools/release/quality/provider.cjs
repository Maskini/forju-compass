const cases = require('./cases.cjs');
const {appendFileSync} = require('node:fs');
class Compass {
  id(){return 'compass-local-http';}
  async callApi(id){
    const c=cases.find(row=>row.id===id.trim());
    if(!c) throw Error('Unknown fixture');
    const isolated=await fetch('http://127.0.0.1:4204/scenario',{method:'POST',signal:AbortSignal.timeout(5000)});
    if(!isolated.ok)throw Error('Disposable scenario quota unavailable');
    const history=[], answers=[]; let topic;
    for(const message of c.turns){
      const body=JSON.stringify({message,history,topic});
      const send=()=>fetch('http://127.0.0.1:4196/api/chat',{method:'POST',headers:{'content-type':'application/json','accept-language':c.lang},body,signal:AbortSignal.timeout(15000)});
      let res=await send();
      if(res.status===429){const s=Number(res.headers.get('retry-after'));if(s>0&&s<=60){await new Promise(r=>setTimeout(r,(s+1)*1000));res=await send();}}
      if(!res.ok)throw Error('Chat HTTP '+res.status);
      const a=await res.json();topic=a.topic;answers.push(a);history.push({role:'user',content:message},{role:'assistant',content:a.answer});
    }
    appendFileSync('/out/'+process.env.AUDIT_PHASE+'-answers.jsonl',JSON.stringify({id:c.id,questions:c.turns,answers})+'\n');
    return {output:JSON.stringify(answers.at(-1))};
  }
}
module.exports=Compass;
