import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePrompts,findPrompt,attachPrompt} from '../public/journal-prompts.mjs';
const prompt={id:'mobile-week',revision:1,course:'mobile-app-dev',week:'2026-11-02',title:'Reflect',body:'Explain your component choices.'};
const data={schemaVersion:1,prompts:[prompt]};
test('published content validates; prompts match course and Monday exactly',()=>{
 validatePrompts(JSON.parse(fs.readFileSync(new URL('../public/data/journal-prompts.json',import.meta.url))));
 assert.equal(findPrompt(data,'mobile-app-dev','2026-11-02').id,prompt.id);
 assert.equal(findPrompt(data,'game-programming','2026-11-02'),null);
 assert.throws(()=>validatePrompts({...data,prompts:[prompt,prompt]}),/one prompt/);
 assert.throws(()=>validatePrompts({...data,prompts:[{...prompt,week:'2026-11-03'}]}),/Monday/);
 assert.throws(()=>validatePrompts({...data,prompts:[{...prompt,body:''}]}),/directions/);
});
test('hand-in copies the displayed prompt and cannot submit without a matching prompt',()=>{
 const snapshot={course_id:prompt.course,activity_id:'journal:'+prompt.week,files:{'journal.md':'My work'}};
 const result=attachPrompt(snapshot,prompt);prompt.body='Revised later';
 assert.equal(JSON.parse(result.files['journal-prompt.json']).body,'Explain your component choices.');
 assert.ok(!snapshot.files['journal-prompt.json']);
 assert.throws(()=>attachPrompt(snapshot,null),/not published/);
 assert.throws(()=>attachPrompt({...snapshot,course_id:'game-programming'},prompt),/not published/);
});
