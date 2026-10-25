import test from 'node:test';import assert from 'node:assert/strict';
import {ActivityReporter,activityState} from '../public/classroom-model.mjs';
const now=Date.parse('2026-10-25T02:00:00Z'),stamp=ms=>new Date(now-ms).toISOString();
const signal=(extra={})=>({visible:true,last_seen_at:stamp(10000),last_interaction_at:stamp(30000),action:'edit',activity_id:'lesson:loops',...extra});
test('signed-in or visible alone never implies active work',()=>{
 assert.equal(activityState([] ,now).label,'No recent signal');assert.equal(activityState([signal({last_interaction_at:null})],now).state,'viewing');assert.equal(activityState([signal({last_interaction_at:stamp(121000)})],now).state,'viewing');assert.equal(activityState([signal()],now).state,'active');assert.equal(activityState([signal({visible:false})],now).state,'unknown');assert.equal(activityState([signal({last_seen_at:stamp(66000)})],now).state,'unknown');
});
test('multiple tabs preserve the visible recent interaction instead of a hidden tab',()=>{
 const active=signal();assert.equal(activityState([signal({visible:false,last_seen_at:stamp(0)}),active],now).signal,active);
});
test('guests, pending and removed class members send zero activity',async()=>{
 for(const memberships of [[],[{status:'pending',course_id:'uil'}],[{status:'removed',course_id:'uil'}]]){
  const calls=[];const r=new ActivityReporter({rpc:async(...a)=>calls.push(a),getMemberships:()=>memberships,visible:()=>true,now:()=>now});await r.setActivity('uil','loops');await r.interact('edit');await r.send(true);assert.equal(calls.length,0);
 }
});
test('approved activity is throttled and never includes code or keystrokes',async()=>{
 let clock=now;const calls=[],r=new ActivityReporter({rpc:async(...a)=>calls.push(a),getMemberships:()=>[{status:'approved',course_id:'uil'}],visible:()=>true,now:()=>clock,session:'session'});
 await r.setActivity('uil','loops');for(let i=0;i<100;i++)await r.interact('edit');assert.equal(calls.length,1);clock+=30000;await r.send();assert.equal(calls.length,2);assert.equal(calls[1][1].p_interacted,true);assert.deepEqual(Object.keys(calls[1][1]).sort(),['p_session','p_course','p_activity','p_action','p_interacted','p_visible'].sort());clock+=30000;await r.send();assert.equal(calls[2][1].p_interacted,false);
});
test('hidden heartbeat marks page hidden without inventing interaction',async()=>{
 const calls=[];let visible=true;const r=new ActivityReporter({rpc:async(...a)=>calls.push(a),getMemberships:()=>[{status:'approved',course_id:'uil'}],visible:()=>visible,now:()=>now});await r.setActivity('uil','loops');visible=false;await r.send(true);assert.equal(calls[1][1].p_visible,false);assert.equal(calls[1][1].p_interacted,false);
});
test('a different course cannot emit activity through a stale class membership',async()=>{
 const calls=[];const r=new ActivityReporter({rpc:async(...a)=>calls.push(a),getMemberships:()=>[{status:'approved',course_id:'uil'}],visible:()=>true});await r.setActivity('mobile-app-dev','html');assert.equal(calls.length,0);
});
