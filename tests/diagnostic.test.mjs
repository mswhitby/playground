import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {placeMath,diagnosticAttempt} from '../public/diagnostic-model.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../public/data/tsi-math/content/diagnostic-v1.json',import.meta.url)));
const correct=Object.fromEntries(data.items.map(q=>[q.id,String(q.answer)]));
test('24 original questions cover six distinct skill groups and keys score correctly',()=>{
 assert.equal(data.items.length,24);assert.equal(new Set(data.items.map(q=>q.id)).size,24);
 assert.equal(data.domains.length,6);assert.equal(placeMath(data,correct).correct,24);
 for(const d of data.domains)assert.equal(data.items.filter(q=>q.domain===d.id).length,4);
});
test('incomplete attempts cannot place students; unknowns remain visible',()=>{
 assert.throws(()=>placeMath(data,{}),/every question/);
 const result=placeMath(data,Object.fromEntries(data.items.map(q=>[q.id,'skip'])));
 assert.ok(result.domains.every(d=>d.skipped===4&&d.placement==='Needs a teacher check'));
});
test('domain threshold does not hide weaknesses behind a total score',()=>{
 const answers={...correct,'foundations-1':'wrong','foundations-2':'wrong','linear-1':'wrong'};
 const result=placeMath(data,answers);
 assert.equal(result.domains[0].placement,'Start with guided prep');
 assert.equal(result.domains[2].placement,'Try a deeper check');
});
test('fractions accepted; first attempt preserved across retry and version resets',()=>{
 const answers={...correct,'foundations-2':'7/8','statistics-3':'3/5'};
 const before=diagnosticAttempt(null,data,answers,'first');
 const after=diagnosticAttempt(before,data,{...answers,'linear-1':'0'},'second');
 assert.equal(after.first.result.correct,24);assert.equal(after.latest.result.correct,23);
 assert.equal(before.latest.at,'first');
 assert.equal(diagnosticAttempt(after,{...data,version:'next'},answers,'third').first.at,'third');
});
