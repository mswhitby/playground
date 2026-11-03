import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {numericValue,checkAnswer,scoreResponses,recordAttempt,readDemo} from '../public/tsi-model.mjs';
const student=JSON.parse(fs.readFileSync(new URL('../public/data/tsi-math/content/week-01-student.json',import.meta.url)));
const keys=JSON.parse(fs.readFileSync(new URL('../public/data/tsi-math/teachers/week-01/answers.json',import.meta.url))).items;
test('numeric inputs distinguish blank, zero, decimals, fractions and invalid expressions',()=>{
 assert.equal(numericValue(''),null);assert.equal(numericValue('0'),0);assert.equal(numericValue('3/4'),.75);assert.equal(numericValue('$25.98'),25.98);assert.equal(numericValue('15%'),15);assert.equal(numericValue('1/0'),null);assert.equal(numericValue('2+2'),null);assert.equal(numericValue('NaN'),null);
});
test('all 50 published answers score and incomplete attempts do not become zeros',()=>{
 const items=student.days.flatMap(d=>['warmup','guided','practice','exit','check'].flatMap(g=>d[g]||[]));
 assert.equal(items.length,50);for(const item of items)assert.equal(checkAnswer(item,keys[item.id],String(keys[item.id].answer)),true,item.id);
 const quiz=student.days[4].check;assert.equal(scoreResponses(quiz,keys,{}),null);
 const answers=Object.fromEntries(quiz.map(q=>[q.id,keys[q.id].answer]));assert.equal(scoreResponses(quiz,keys,answers).correct,10);
 answers[quiz[0].id]='A';assert.equal(scoreResponses(quiz,keys,answers).correct,9);
});
test('equivalent slope-intercept forms are accepted without running input as code',()=>{
 const q=student.days[2].practice[1],key=keys[q.id];
 for(const answer of ['y=-2x+7','y = 7 - 2*x','y=−2x+7'])assert.equal(checkAnswer(q,key,answer),true);
 for(const answer of ['y=2x+7','y=-2x+8','y=alert(1)','y=-2x+7junk'])assert.equal(checkAnswer(q,key,answer),false);
});
test('a retry preserves the first score and first submitted answers',()=>{
 const items=student.days[0].exit,answers={[items[0].id]:'0',[items[1].id]:'15'};
 const empty={schemaVersion:1,answers:{},attempts:{},reflections:{}};
 const first=recordAttempt(empty,'exit',scoreResponses(items,keys,answers),answers,'2026-11-03T12:00:00Z');
 answers[items[0].id]='27';const next=recordAttempt(first,'exit',scoreResponses(items,keys,answers),answers,'2026-11-03T12:01:00Z');
 assert.equal(first.attempts.exit.first.correct,1);assert.equal(next.attempts.exit.first.correct,1);assert.equal(next.attempts.exit.latest.correct,2);assert.equal(next.attempts.exit.first.answers[items[0].id],'0');assert.equal(next.attempts.exit.count,2);assert.deepEqual(empty.attempts,{});
});
test('damaged browser storage falls back to a fresh demo record',()=>{
 assert.equal(readDemo({getItem:()=>'{bad'}).schemaVersion,1);assert.deepEqual(readDemo({getItem:()=>null}).attempts,{});assert.deepEqual(readDemo({getItem:()=>'{"schemaVersion":1,"answers":[],"attempts":{},"reflections":{}}'}).answers,{});
});
