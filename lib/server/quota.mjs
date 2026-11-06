// Node 24, single Node host. Keep the database on a persistent local volume.
import {DatabaseSync} from "node:sqlite";
import {createHmac,randomBytes} from "node:crypto";
import {isIP} from "node:net";

export function openQuota(path) {
  const db=new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout=1500; CREATE TABLE IF NOT EXISTS counts (bucket TEXT PRIMARY KEY, ends INTEGER NOT NULL, n INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY,v TEXT NOT NULL)");
  db.prepare("INSERT OR IGNORE INTO settings VALUES ('salt',?)").run(randomBytes(32).toString("hex"));
  const salt=db.prepare("SELECT v FROM settings WHERE k='salt'").get().v;
  const get=db.prepare("SELECT n FROM counts WHERE bucket=?");
  const increment=db.prepare("INSERT INTO counts VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET n=n+1");
  return {close:()=>db.close(),take(ip,now=Date.now()){
    const visitor=isIP(ip||"") ? createHmac("sha256",salt).update(ip).digest("hex") : "";
    const rules=[["all-minute",60000,12],["all-day",86400000,300]];
    if(visitor) rules.push([visitor+"-minute",60000,5],[visitor+"-day",86400000,40]);
    db.exec("BEGIN IMMEDIATE");
    try{
      db.prepare("DELETE FROM counts WHERE ends<=?").run(now);
      let delay=0;
      for(const [key,width,limit] of rules){
        if((get.get(key)?.n??0)>=limit)delay=Math.max(delay,width-now%width);
      }
      if(!delay)for(const [key,width] of rules)increment.run(key,now-now%width+width);
      db.exec("COMMIT");
      return Math.ceil(delay/1000);
    }catch(e){db.exec("ROLLBACK");throw e;}
  }};
}
