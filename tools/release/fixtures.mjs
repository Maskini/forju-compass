// Local HTTPS host, disallowed host, Compass reverse proxy, and fake mail provider.
// Only this test program can read or reset the synthetic inbox; it is never shipped.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const tls={key:fs.readFileSync('/tmp/release.key'),cert:fs.readFileSync('/tmp/release.crt')};
const host='127.0.0.1';
for(const port of [4201,4202]){
  https.createServer(tls,(req,res)=>{
    const lang=req.url.startsWith('/de')?'de':'en';
    res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
    res.end(`<!doctype html><html lang="${lang}"><meta name="viewport" content="width=device-width"><title>ForJu local installation</title><main><h1>Website preview</h1><label>Paste copied text<textarea></textarea></label></main><script defer src="https://127.0.0.1:4203/compass-widget.js"></script></html>`);
  }).listen(port,host);
}
https.createServer(tls,(req,res)=>{
  const upstream=http.request({host,port:4196,path:req.url,method:req.method,headers:{...req.headers,host:host+':4196'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
  upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream);
}).listen(4203,host);
let inbox=new Map(), attempts=[], loseAck=false;
http.createServer(async(req,res)=>{
  const json=(status,value)=>{res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value))};
  // Independent answer scenarios are not a load test. Reset ONLY the disposable
  // audit database between them; k6/security separately exercise real quotas.
  if(req.method==='POST'&&req.url==='/scenario'){
    const path=process.env.COMPASS_QUOTA_DB;
    if(path!=='/tmp/compass-check-release/quota.sqlite')return json(403,{});
    const db=new DatabaseSync(path);
    try{if(db.prepare("select 1 from sqlite_master where name='counts'").get())db.exec('delete from counts')}finally{db.close()}
    return json(200,{});
  }
  if(req.method==='POST'&&req.url==='/reset'){inbox=new Map();attempts=[];loseAck=true;return json(200,{})}
  if(req.method==='GET'&&req.url==='/inbox')return json(200,{messages:[...inbox.values()],attempts});
  if(req.method!=='POST'||req.url!=='/emails')return json(404,{});
  let raw='';for await(const chunk of req)raw+=chunk;
  const key=req.headers['idempotency-key'];if(!key||req.headers.authorization!=='Bearer re_local_fixture')return json(403,{message:'invalid fixture credentials'});
  const mail=JSON.parse(raw);attempts.push(key);
  if(!inbox.has(key))inbox.set(key,{id:crypto.randomUUID(),mail});
  // Store first, then lose its acknowledgement. A retry must not add another mail.
  if(loseAck){loseAck=false;return json(503,{name:'application_error',message:'synthetic lost acknowledgement'})}
  return json(200,{id:inbox.get(key).id});
}).listen(4204,host);
