import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherReadOnlyClient,teacherRosterRows} from '../public/integration/teacher-readonly.js';
const uuid='00000000-0000-4000-8000-000000000001';
const storage={getItem:()=>JSON.stringify({access_token:'test-token',expires_at:Date.now()/1000+1000})};
test('teacher read-only adapter requires server-authorized teacher role',async()=>{
 const calls=[];
 const fetchImpl=async(url,opts)=>{calls.push([url,opts]);let data;
  if(url.endsWith('/auth/v1/user'))data={id:uuid};
  else if(url.endsWith('/rpc/playground_classroom_context'))data={is_teacher:false};
  else throw Error('unexpected request');
  return {ok:true,json:async()=>data};
 };
 const result=await teacherReadOnlyClient({storage,fetchImpl});
 assert.equal(result.status,'forbidden');
 assert.equal(calls.length,2);
 assert.equal(calls[0][1].method,'GET');
 assert.equal(calls[1][1].method,'POST');
});
test('teacher RPC allowlist rejects writes before network calls',async()=>{
 const names=[];const fetchImpl=async(url,opts)=>{
  names.push(url);
  const data=url.endsWith('/auth/v1/user')?{id:uuid}:url.endsWith('/rpc/playground_classroom_context')?{is_teacher:true}:[{id:uuid,name:'CS1',course_id:'computer-science-1'}];
  return {ok:true,json:async()=>data};
 };
 const service=await teacherReadOnlyClient({storage,fetchImpl});
 assert.equal(service.status,'ready');
 await assert.rejects(()=>service.rpc('playground_teacher_set_member',{p_class:uuid}),/not allowed/);
 await assert.rejects(()=>service.rpc('playground_teacher_student_history',{p_class:'bad',p_student:uuid}),/Invalid/);
 assert.equal(names.length,3);
});
test('teacher rows only include approved members and server weekly totals',()=>{
 const rows=teacherRosterRows({roster:[{user_id:'a',display_name:'Ada',status:'approved'},{user_id:'b',display_name:'Ben',status:'pending'}],checks:[{user_id:'a',checks:3}]},
 {weeks:[{user_id:'a',week_start:'2026-11-16',points:7,assignments:2}]},'2026-11-16');
 assert.equal(rows.length,1);assert.equal(rows[0].points,7);assert.equal(rows[0].checks,3);
});

test('authorized identity readers are allowlisted, mutations remain denied',async()=>{
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push(url);
  const data=url.endsWith('/auth/v1/user')?{id:uuid}:url.endsWith('/rpc/playground_classroom_context')?{is_teacher:true}:url.endsWith('/rpc/playground_teacher_classes')?[]:[];
  return {ok:true,json:async()=>data};
 };
 const service=await teacherReadOnlyClient({storage,fetchImpl});
 assert.equal(service.status,'ready');
 for(const name of ['playground_teacher_names','playground_teacher_sheet_roster','playground_teacher_directory'])assert.deepEqual(await service.rpc(name),[]);
 await assert.rejects(()=>service.rpc('playground_teacher_save_names',{p_rows:[]}),/not allowed/);
 await assert.rejects(()=>service.rpc('playground_teacher_sync_sheet',{p_rows:[]}),/not allowed/);
 assert.equal(calls.length,6);
});
