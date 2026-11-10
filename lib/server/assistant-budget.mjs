import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';

// Hold a conservative maximum before calling. Reconcile only provider-reported
// usage afterwards; a timeout, crash or missing usage keeps its entire hold.
// Luna standard prices reviewed 2026-11-10: input .20, cached .02, output 1.20
// USD/M. Cache writes cost 1.25x (30m) / 2.5x (12h) input. Unknown TTL uses 2.5x.
export function reservationMicros(bytes,outputTokens) {
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>80000||!Number.isSafeInteger(outputTokens)||outputTokens<1||outputTokens>1800)throw Error('Invalid reservation');
  return Math.ceil((bytes+4096)*0.5+outputTokens*1.2);
}
export function usageMicros(usage) {
  const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
  if(!usage||!count(usage.input_tokens)||!count(usage.output_tokens)||usage.input_tokens+usage.output_tokens===0)return null;
  const {input_tokens:input,output_tokens:output,input_tokens_details:details}=usage;
  if(!details||!count(details.cached_tokens)||!count(details.cache_write_tokens))return null;
  const read=details.cached_tokens,write=details.cache_write_tokens;
  if(read+write>input)return null;
  let writeCost=write*.5;
  if(details.cache_write_tokens_details){
    const {ttl_30m_tokens:short,ttl_12h_tokens:long}=details.cache_write_tokens_details;
    if(!count(short)||!count(long)||short+long!==write)return null;
    writeCost=short*.25+long*.5;
  }
  return Math.ceil((input-read-write)*.2+read*.02+writeCost+output*1.2);
}
export function openAssistantBudget(path){
  const db=new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=1500; CREATE TABLE IF NOT EXISTS assistant_budget (day TEXT PRIMARY KEY, micros INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS assistant_reservations (id TEXT PRIMARY KEY, day TEXT NOT NULL, micros INTEGER NOT NULL, settled INTEGER NOT NULL DEFAULT 0)');
  const dayAt=now=>new Date(now).toISOString().slice(0,10);
  return {close:()=>db.close(),snapshot(now=Date.now()){
    return {usedMicros:db.prepare('SELECT micros FROM assistant_budget WHERE day=?').get(dayAt(now))?.micros??0};
  },reserve(micros,cap,now=Date.now()){
    if(!Number.isSafeInteger(micros)||micros<1||!Number.isSafeInteger(cap)||cap<1)return false;
    const day=dayAt(now),id=randomUUID();
    db.exec('BEGIN IMMEDIATE');
    try{
      const used=db.prepare('SELECT micros FROM assistant_budget WHERE day=?').get(day)?.micros??0;
      if(used+micros>cap){db.exec('COMMIT');return false;}
      db.prepare('INSERT INTO assistant_budget VALUES (?,?) ON CONFLICT(day) DO UPDATE SET micros=micros+excluded.micros').run(day,micros);
      db.prepare('INSERT INTO assistant_reservations (id,day,micros) VALUES (?,?,?)').run(id,day,micros);
      const expired=dayAt(now-2*86400000);
      db.prepare('DELETE FROM assistant_reservations WHERE day<?').run(expired);
      db.prepare('DELETE FROM assistant_budget WHERE day<?').run(expired);
      db.exec('COMMIT');return {id,day};
    }catch(error){db.exec('ROLLBACK');throw error;}
  },settle(ticket,usage){
    const actual=usageMicros(usage);
    if(actual===null||typeof ticket?.id!== 'string')return false;
    db.exec('BEGIN IMMEDIATE');
    try{
      const row=db.prepare('SELECT * FROM assistant_reservations WHERE id=?').get(ticket.id);
      if(!row||row.settled){db.exec('COMMIT');return false;}
      // If usage unexpectedly exceeds the hold, account for all of it; future
      // requests stop at the cap. Never conceal an overrun by clamping charges.
      db.prepare('UPDATE assistant_budget SET micros=micros+? WHERE day=?').run(actual-row.micros,row.day);
      db.prepare('UPDATE assistant_reservations SET settled=1 WHERE id=?').run(ticket.id);
      db.exec('COMMIT');return true;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }};
}
