import test from 'node:test';import assert from 'node:assert/strict';
import {difficultyRank,recordedScore,latestSubmissions,assessedHistory,gradeLabel,submissionGrade} from '../public/grade-results.mjs';
test('difficulty order follows challenge progression',()=>{assert.deepEqual(['Hard','Easy','Very Easy'].sort((a,b)=>difficultyRank(a)-difficultyRank(b)),['Very Easy','Easy','Hard'])});
test('only valid recorded grades supply numeric scores; public browser checks do not',()=>{
 assert.equal(recordedScore({scope:'public_examples',status:'graded',points:10,possible:10}),null);
 assert.deepEqual(recordedScore({scope:'grader_tests',status:'graded',points:7,possible:10}),{points:7,possible:10});
 for(const points of [NaN,Infinity,-1,11,'10'])assert.equal(recordedScore({scope:'grader_tests',status:'graded',points,possible:10}),null);
 assert.equal(gradeLabel({status:'queued'}),'Grading…');assert.equal(gradeLabel({status:'error'}),'Grading needs review');assert.equal(gradeLabel(null),'Not graded');
});
test('latest submitted version wins, zero is a score, review flags stay separate',()=>{
 const row={id:'first',course_id:'python',activity_id:'lesson:one',submitted_at:'2026-11-03T22:00:00Z'};
 const result=latestSubmissions([row,{...row,id:'last',submitted_at:'2026-11-03T23:00:00Z'},{...row,activity_id:'review:lesson:one'}]);assert.equal(result.length,1);assert.equal(result[0].id,'last');assert.equal(gradeLabel({status:'graded',scope:'published_tests',points:0,possible:5}),'0 / 5');
});
test('missing grade setup preserves submitted history without inventing grades',async()=>{
 const db={from(){return {select(){return {in:async()=>({error:{code:'PGRST205'}}),eq(){return {maybeSingle:async()=>({error:{code:'PGRST205'}})}}}}}}};
 const row={id:'receipt'};assert.deepEqual(await assessedHistory(db,[row]),[{id:'receipt',grade:{status:'unavailable'}}]);assert.deepEqual(await submissionGrade(db,'receipt'),{status:'unavailable'});
});
test('transient backend errors are surfaced instead of turning into zero scores',async()=>{const error=new Error('offline');const db={from(){return {select(){return {in:async()=>({error})}}}}};await assert.rejects(assessedHistory(db,[{id:'r'}]),/offline/)});
