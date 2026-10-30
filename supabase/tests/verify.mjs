import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
const read=file=>readFile(new URL(file,import.meta.url),'utf8');
// Exercise the one-click setup both with and without prior submission storage.
for(const hasSubmissions of [false,true]){
 const db=new PGlite();try{
  for(const file of ['./bootstrap.sql','../migrations/202610240001_progress.sql','./classroom-identities.sql',...(hasSubmissions?['../migrations/202610240002_submissions.sql']:[]),'../teacher-dashboard-setup.sql','./classroom-isolation.sql','../migrations/202610260004_auto_join.sql','./auto-join.sql','../migrations/202610300005_manual_class_assignments.sql','./manual-assignments.sql','../migrations/202610300006_registered_account_roster.sql','./registered-account-roster.sql']){
   const result=await db.exec(await read(file));if(file==='./classroom-isolation.sql')console.log((hasSubmissions?'Existing submissions: ':'Missing submissions: ')+result.at(-1).rows[0].result);
  }
 }finally{await db.close()}
}
