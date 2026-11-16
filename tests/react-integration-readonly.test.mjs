import test from 'node:test';
import assert from 'node:assert/strict';
import {mapVerifiedCs1History,readOnlyCs1Snapshot} from '../frontend/integration-readonly.js';

const attempt=(id,points,at,scope='grader_tests')=>({
  id,course_id:'computer-science-1',activity_id:'lesson:02-values-and-variables/01-meet-variables',
  submitted_at:at,
  grade:{status:'graded',scope,points,possible:10,graded_at:at}
});

test('read-only integration preserves highest verified CS1 grade and positive weekly gains',()=>{
  const records=[
    attempt('a',3,'2026-11-09T18:00:00Z'),
    attempt('b',7,'2026-11-11T18:00:00Z'),
    attempt('c',2,'2026-11-12T18:00:00Z'),
    {...attempt('d',99,'2026-11-12T19:00:00Z'),course_id:'uil'},
    attempt('e',10,'2026-11-12T18:00:00Z','browser-check')
  ];
  const result=mapVerifiedCs1History(records);
  assert.equal(result.grades.length,1);
  assert.equal(result.grades[0].earned,7);
  assert.equal(result.grades[0].id,'lesson:02-values-and-variables/01-meet-variables');
  assert.deepEqual(result.weeklyPoints,[{week:'2026-11-09',earned:7,possible:0,count:2}]);
});

test('missing account never loads grades or writes data',async()=>{
  let called=false;
  const client={auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>{called=true}}};
  const result=await readOnlyCs1Snapshot(client);
  assert.equal(result.status,'signed-out');assert.equal(called,false);
});

test('integration reads existing owner-scoped submissions and grades with no mutation',async()=>{
  const rows=[attempt('a',4,'2026-11-09T18:00:00Z'),attempt('b',8,'2026-11-10T18:00:00Z')];
  const reads=[];
  const client={
    auth:{
      getSession:async()=>({data:{session:{access_token:'test'}},error:null}),
      getUser:async()=>({data:{user:{id:'student-1',user_metadata:{user_name:'coder'}}},error:null})
    },
    from(table){
      reads.push(table);
      const query={
        select(){return this},
        eq(column,value){assert.equal(column,'user_id');assert.equal(value,'student-1');return this},
        order(){return this},
        range(start,end){return Promise.resolve({data:rows.slice(start,end+1),error:null})},
        in(column,ids){assert.equal(column,'submission_id');return Promise.resolve({data:
          rows.filter(r=>ids.includes(r.id)).map(r=>({submission_id:r.id,...r.grade})),error:null})}
      };
      return new Proxy(query,{get(target,key){
        if(['insert','update','upsert','delete','rpc'].includes(key))throw Error('Write method accessed');
        return target[key];
      }});
    }
  };
  const value=await readOnlyCs1Snapshot(client);
  assert.equal(value.status,'signed-in');
  assert.equal(value.user.handle,'coder');
  assert.deepEqual(value.grades.map(g=>g.earned),[8]);
  assert.equal(value.weeklyPoints[0].earned,8);
  assert.deepEqual(reads,['playground_submissions','playground_grades']);
});
