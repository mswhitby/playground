import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlyCs1Snapshot,verifiedCs1Snapshot} from '../public/integration/account-bridge.js';

const uuid=(n)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const item=(n,at,activity='lesson:unit/first')=>({
 id:uuid(n),course_id:'computer-science-1',activity_id:activity,submitted_at:at
});
const grade=(n,points,possible=10,status='graded',scope='grader_tests')=>({
 submission_id:uuid(n),status,points,possible,scope,graded_at:'2026-11-17T15:00:00Z'
});
const storage=(session)=>({getItem:key=>key==='playground-auth-v1'?JSON.stringify(session):null});

test('read-only integration does not contact the server without a valid existing session',async()=>{
 let called=false;
 const fetchImpl=()=>{called=true;throw Error('must not fetch');};
 const guest=await readOnlyCs1Snapshot({storage:storage(null),fetchImpl});
 assert.equal(guest.status,'signed-out');
 const expired=await readOnlyCs1Snapshot({storage:storage({access_token:'old',expires_at:1}),fetchImpl,now:Date.now()});
 assert.equal(expired.status,'signed-out');
 assert.equal(called,false);
});

test('only authenticated GET requests retrieve self-owned submissions and grades',async()=>{
 const urls=[];
 const sub=item(1,'2026-11-16T20:00:00Z');
 const fetchImpl=async (url,options)=>{
  const parsed=new URL(url);
  urls.push({url:parsed,options});
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Bearer test-token');
  assert.ok(options.headers.apikey.startsWith('sb_publishable_'));
  if(parsed.pathname.endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:'verified-user',user_metadata:{user_name:'student'}})};
  if(parsed.pathname.endsWith('/playground_submissions')){
   assert.equal(parsed.searchParams.get('user_id'),'eq.verified-user');
   assert.equal(parsed.searchParams.get('course_id'),'eq.computer-science-1');
   return {ok:true,json:async()=>[sub]};
  }
  if(parsed.pathname.endsWith('/playground_grades')){
   assert.equal(parsed.searchParams.get('submission_id'),'in.('+uuid(1)+')');
   return {ok:true,json:async()=>[grade(1,8)]};
  }
  throw Error('unexpected endpoint');
 };
 const result=await readOnlyCs1Snapshot({
  storage:storage({access_token:'test-token',expires_at:Date.now()/1000+3600}),fetchImpl
 });
 assert.equal(result.status,'signed-in');
 assert.equal(result.user.handle,'student');
 assert.deepEqual(result.grades.map(g=>g.earned),[8]);
 assert.equal(result.weeklyPoints[0].earned,8);
 assert.equal(urls.length,3);
 assert.ok(urls.every(r=>r.url.hostname==='lndzhmwvooqfrqcafhut.supabase.co'));
});

test('highest verified activity score survives lower and ungraded resubmissions',()=>{
 const submissions=[
  item(1,'2026-11-14T20:00:00Z'),
  item(2,'2026-11-15T20:00:00Z'),
  item(3,'2026-11-16T20:00:00Z'),
  item(4,'2026-11-17T20:00:00Z'),
  item(5,'2026-11-17T21:00:00Z','review:unit/first'),
  item(6,'2026-11-17T22:00:00Z','lesson:unit/second')
 ];
 const grades=[grade(1,8),grade(2,3),grade(3,10),grade(4,10,10,'queued'),
  grade(5,10),grade(6,4,10,'graded','other')];
 const r=verifiedCs1Snapshot(submissions,grades);
 assert.equal(r.grades.length,1);
 assert.equal(r.grades[0].id,'lesson:unit/first');
 assert.equal(r.grades[0].earned,10);
 assert.deepEqual(r.weeklyPoints.map(w=>({week:w.week,earned:w.earned})),[
  {week:'2026-11-16',earned:2},{week:'2026-11-09',earned:8}
 ]);
});

test('weekly boundary is local Central Time, not UTC date or graded timestamp',()=>{
 const submissions=[
  item(1,'2026-11-16T05:30:00Z','lesson:boundary'),
  item(2,'2026-11-16T06:30:00Z','lesson:boundary')
 ];
 const r=verifiedCs1Snapshot(submissions,[grade(1,2),grade(2,7)]);
 assert.deepEqual(r.weeklyPoints.map(w=>({week:w.week,earned:w.earned})),[
  {week:'2026-11-16',earned:5},{week:'2026-11-09',earned:2}
 ]);
});

test('RLS or connectivity failures fail closed instead of fabricating grades',async()=>{
 const result=await readOnlyCs1Snapshot({
  storage:storage({access_token:'test-token',expires_at:Date.now()/1000+3600}),
  fetchImpl:async()=>({ok:false,status:403})
 });
 assert.equal(result.status,'unavailable');
 assert.deepEqual(result.grades,[]);
 assert.deepEqual(result.weeklyPoints,[]);
});
