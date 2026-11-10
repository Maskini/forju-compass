import {DatabaseSync} from 'node:sqlite';

// Conservative reservations, never refunds: an ambiguous timeout may be billed.
// Reviewed standard gpt-5.6-luna prices, 2026-11-10: $0.20/M input, $1.20/M output.
// UTF-8 bytes plus overhead bound estimated input tokens; no cache discounts.
export function reservationMicros(bytes,outputTokens) {
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>80000||!Number.isSafeInteger(outputTokens)||outputTokens<1||outputTokens>1800)throw Error('Invalid reservation');
  return Math.ceil((bytes+4096)*0.2+outputTokens*1.2);
}
export function openAssistantBudget(path){
  const db=new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=1500; CREATE TABLE IF NOT EXISTS assistant_budget (day TEXT PRIMARY KEY, micros INTEGER NOT NULL)');
  return {close:()=>db.close(),reserve(micros,cap,now=Date.now()){
    if(!Number.isSafeInteger(micros)||micros<1||!Number.isSafeInteger(cap)||cap<1)return false;
    const day=new Date(now).toISOString().slice(0,10);
    db.exec('BEGIN IMMEDIATE');
    try{
      const used=db.prepare('SELECT micros FROM assistant_budget WHERE day=?').get(day)?.micros??0;
      if(used+micros>cap){db.exec('COMMIT');return false;}
      db.prepare('INSERT INTO assistant_budget VALUES (?,?) ON CONFLICT(day) DO UPDATE SET micros=micros+excluded.micros').run(day,micros);
      db.prepare('DELETE FROM assistant_budget WHERE day<?').run(day);
      db.exec('COMMIT');return true;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }};
}
