import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
const read=file=>readFile(new URL(file,import.meta.url),'utf8');
// Exercise the one-click setup both with and without prior submission storage.
for(const hasSubmissions of [false,true]){
 const db=new PGlite();try{
  for(const file of ['./bootstrap.sql','../migrations/202610240001_progress.sql','./classroom-identities.sql',...(hasSubmissions?['../migrations/202610240002_submissions.sql']:[]),'../teacher-dashboard-setup.sql','./classroom-isolation.sql','../migrations/202610260004_auto_join.sql','./auto-join.sql']){
   const result=await db.exec(await read(file));if(file==='./classroom-isolation.sql')console.log((hasSubmissions?'Existing submissions: ':'Missing submissions: ')+result.at(-1).rows[0].result);
  }
 }finally{await db.close()}
}
