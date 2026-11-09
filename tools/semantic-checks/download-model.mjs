// Explicit maintainer download, never called by the website or a visitor request.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('./model-manifest.json',import.meta.url)));
const root=resolve(import.meta.dirname,'../../work/semantic-benchmark/models/multilingual-minilm');
for(const file of manifest.files){
 const path=resolve(root,file.path);if(!path.startsWith(root+'/'))throw Error('Invalid model path');
 let bytes=existsSync(path)?readFileSync(path):null;
 const valid=b=>b?.length===file.bytes&&createHash('sha256').update(b).digest('hex')===file.sha256;
 if(!valid(bytes)){
  const url=`https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${file.path}`;
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Model download HTTP '+response.status);
  bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw Error('Model checksum mismatch: '+file.path);
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);
 }
 console.log('Verified '+file.path+' ('+file.bytes+' bytes)');
}
