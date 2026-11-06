import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openQuota} from "../lib/server/quota.mjs";
test("one visitor cannot spend the shared budget; restart preserves both counters",()=>{
 const dir=mkdtempSync(join(tmpdir(),"forju-quota-")),path=join(dir,"state");
 let store=openQuota(path);try{
 for(let i=0;i<5;i++)assert.equal(store.take("192.0.2.1",1000),0);
 assert.equal(store.take("192.0.2.1",1000),59);store.close();store=openQuota(path);
 assert.equal(store.take("192.0.2.1",1000),59);
 for(let i=2;i<=8;i++)assert.equal(store.take("192.0.2."+i,1000),0);
 assert.equal(store.take("192.0.2.9",1000),59);assert.equal(store.take("192.0.2.1",61000),0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});
