import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateCourse,scoreQuiz,progressKey} from '../public/model.mjs';
const course=JSON.parse(fs.readFileSync(process.env.GAME_COURSE||new URL('../../game-programming/course.json',import.meta.url),'utf8'));
test('all exercises follow already-taught lesson prerequisites',()=>{assert.equal(validateCourse(course),course);const bad=structuredClone(course);bad.units[0].lessons[0].prerequisites=['gameplay-02'];assert.throws(()=>validateCourse(bad),/untaught/)});
test('all checkpoint options are valid and correct answers score 100%',()=>{for(const u of course.units){const answers=Object.fromEntries(u.quiz.questions.map(q=>[q.id,q.answer]));assert.equal(scoreQuiz(u.quiz.questions,answers).percent,100);assert.equal(scoreQuiz(u.quiz.questions,{}),null);answers[u.quiz.questions[0].id]=-1;assert.equal(scoreQuiz(u.quiz.questions,answers),null)}});
test('wrong choices produce a real lower score',()=>{const qs=course.units[0].quiz.questions;const answers=Object.fromEntries(qs.map(q=>[q.id,(q.answer+1)%q.choices.length]));assert.equal(scoreQuiz(qs,answers).correct,0)});
test('course progress namespaces avoid cross-course collisions',()=>{assert.notEqual(progressKey('game-programming','unit1'),progressKey('mobile-app-dev','unit1'))});
test('invalid question content is rejected',()=>{const bad=structuredClone(course);bad.units[0].quiz.questions[0].answer=900;assert.throws(()=>validateCourse(bad),/question/)});
