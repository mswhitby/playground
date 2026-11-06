import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {bracketProjectCheckSource} from '../public/bracket-project-checks.mjs';
import {buildProjectPreview,projectCheckSource} from '../public/project-preview.mjs';

test('bracket steps have injectable browser-only behavioral checks',()=>{
 for(const step of ['scaffold','page','style','teams','matchups','layout','picks','scoring','leaderboard','test']){
  const code=bracketProjectCheckSource(step);
  assert.match(code,/bracketApp/);
  assert.match(code,/project-checks/);
  new vm.Script(code);
  const html=buildProjectPreview('<html><head></head><body><main id="bracket"></main></body></html>',{token:'sample',step,projectId:'bracket-challenge',check:true});
  assert.match(html,/bracketApp/);
  assert.match(html,/window.onerror/);
  assert.match(html,/form-action/);
 }
 assert.throws(()=>bracketProjectCheckSource('grades'),/Unknown bracket/);
});
test('club-connect retains its original checks and default preview behavior',()=>{
 assert.match(projectCheckSource('structure'),/club-signup/);
 const result=buildProjectPreview('<h1>Club</h1>',{token:'club',step:'structure',check:true});
 assert.match(result,/club-signup/);
 assert.ok(!result.includes('window.bracketApp'));
});
test('checks report failure instead of throwing on incomplete code',async()=>{
 const messages=[];
 const document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
 const context={document,window:{},send:(kind,details)=>messages.push({kind,...details}),console:{warn:()=>{}}};
 await vm.runInNewContext(bracketProjectCheckSource('teams'),context);
 assert.equal(messages.length,1);
 assert.equal(messages[0].kind,'project-checks');
 assert.equal(messages[0].results.some(r=>r.pass===false),true);
});
test('preview Run does not inject checkpoint code',()=>{
 const result=buildProjectPreview('<h1>Bracket</h1>',{token:'bracket',step:'teams',projectId:'bracket-challenge',check:false});
 assert.ok(!result.includes('window.bracketApp'));
 assert.match(result,/window.onerror/);
});
