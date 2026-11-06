import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
loadEnvConfig(process.cwd());
const catalog=JSON.parse(await readFile('knowledge/catalog.json','utf8')).filter(e=>e.active);
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const {data:existing,error}=await db.from('documents').select('title').in('title',catalog.map(e=>e.indexTitle));
if(error) throw new Error(error.message);
const pending=catalog.filter(e=>!existing.some(d=>d.title===e.indexTitle));
console.log(JSON.stringify({activeEntries:catalog.length,alreadyIndexed:catalog.length-pending.length,toImport:pending.length}));
if(!process.argv.includes('--apply')) process.exit(0);
if(pending.length) {
const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:60000,maxRetries:1});
const embeddings=await ai.embeddings.create({model:'text-embedding-3-small',input:pending.map(e=>`${e.title}\nTyp: ${e.kind}\n${e.keywords}\n${e.content}`)});
const rows=pending.map((e,i)=>({title:e.indexTitle,content:`Typ: ${e.kind}\nQuelle: ${e.sourceTitle}\n${e.content}`,source_url:e.sourceUrl,embedding:embeddings.data[i].embedding}));
const {error:insertError}=await db.from('documents').insert(rows);
if(insertError) throw new Error(insertError.message);
console.log(`Imported ${rows.length} entries.`);
}
console.log('Current catalog indexed; existing records preserved.');
