import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {scoreWritten} from '../public/uil.mjs';
import {buildChecks} from '../public/csharp-protocol.mjs';
const questions=JSON.parse(await readFile(new URL('../../uil/practice/written-01.json',import.meta.url))).questions;
test('written practice keeps the 38 choice and two discrete-answer format',()=>{assert.equal(questions.length,40);assert.equal(new Set(questions.map(q=>q.id)).size,40);assert(questions.slice(0,38).every(q=>q.choices.length===5&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<5));assert(questions.slice(38).every(q=>!q.choices&&typeof q.answer==='string'))});
test('written scoring distinguishes blank, wrong, correct, and trimmed discrete answers',()=>{assert.deepEqual(scoreWritten(questions,{}),{correct:0,answered:0,total:40});const answers=Object.fromEntries(questions.map(q=>[q.id,q.answer]));answers['written-39']=' -10 ';assert.equal(scoreWritten(questions,answers).correct,40);answers['written-01']=0;answers['written-40']='';const score=scoreWritten(questions,answers);assert.equal(score.correct,38);assert.equal(score.answered,39)});
test('C# checker targets descriptive student classes',()=>{assert.match(buildChecks([{call:'CalculateScore(3)',expected:'6'}],'ScoreCalculator'),/global::ScoreCalculator.CalculateScore\(3\)/);assert.throws(()=>buildChecks([{call:'F()',expected:'0'}],'bad class'))});
