import {DatabaseSync} from 'node:sqlite';
const path=process.env.COMPASS_QUOTA_DB;
if(path!=='/tmp/compass-check-release/quota.sqlite')throw Error('Expected disposable release quota');
const db=new DatabaseSync(path);
if(db.prepare("select 1 from sqlite_master where name='counts'").get())db.exec('delete from counts');
db.close();
