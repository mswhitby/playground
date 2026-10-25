import test from 'node:test';
import assert from 'node:assert/strict';
import {SubmissionService} from '../public/submissions.mjs';
import {PracticeSync} from '../public/account-sync.mjs';
const snapshot=()=>({course_id:'uil',activity_id:'loops',activity_kind:'programming',files:{'Loops.java':'original'}});
function client(result){const calls=[];return {calls,from(table){const q={insert(row){calls.push({table,row:structuredClone(row)});return q},upsert(row){calls.push({table,row});return q},select(){return q},eq(){return q},single(){return Promise.resolve(typeof result==='function'?result():result)},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return q}}}
test('100 checks save only practice evidence and never submit',async()=>{
 const db=client({});const sync=new PracticeSync({client:db,userId:'a',cache:{},storage:{getItem(){return null},setItem(){}}});
 for(let i=0;i<100;i++)sync.write('playground:uil:check:loops',JSON.stringify({passed:i===99}),null);
 assert.equal(sync.queue.filter(x=>x.type==='attempt').length,100);await sync.flush();sync.dispose();assert.equal(db.calls.length,101);assert.ok(db.calls.every(c=>c.table==='playground_attempts'||c.table==='playground_progress'));
});
test('only explicit submit saves an immutable code snapshot and server receipt',async()=>{
 const db=client({data:{id:'receipt',submitted_at:'2026-10-25T01:00:00Z'}}),service=new SubmissionService(db,'a'),s=snapshot();
 assert.equal(db.calls.length,0);const promise=service.submit(s);s.files['Loops.java']='edited later';const receipt=await promise;
 assert.equal(receipt.id,'receipt');assert.equal(db.calls[0].table,'playground_submissions');assert.equal(db.calls[0].row.files['Loops.java'],'original');assert.equal(db.calls[0].row.user_id,'a');assert.equal(db.calls[0].row.submitted_at,undefined);
});
test('a failed explicit submit retries the same id without background submission',async()=>{
 let fail=true;const db=client(()=>fail?{error:{code:'NETWORK'}}:{data:{id:'receipt',submitted_at:'2026-10-25T01:00:00Z'}}),service=new SubmissionService(db,'a');
 await assert.rejects(service.submit(snapshot()),/not confirmed/);assert.equal(db.calls.length,1);fail=false;await service.submit(snapshot());assert.equal(db.calls[0].row.id,db.calls[1].row.id);
});
test('guest submissions and oversized payloads are rejected before writing',async()=>{
 const db=client({});await assert.rejects(new SubmissionService(db,null).submit(snapshot()),/Sign in/);const s=snapshot();s.files.code='x'.repeat(300000);await assert.rejects(new SubmissionService(db,'a').submit(s),/too large/);assert.equal(db.calls.length,0);
});
