import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {componentProjectCheckSource} from '../public/component-project-checks.mjs';
import {buildProjectPreview} from '../public/project-preview.mjs';
test('planning and review cannot claim an automated pass',()=>{
 for(const step of ['plan','review']){
  let result;vm.runInNewContext(componentProjectCheckSource(step),{send:(kind,data)=>{result=data.results;}});
  assert.ok(result.every(r=>r.pass===false));
 }
});
test('component preview routes to its own behavioral checks, not club signup',()=>{
 for(const step of ['build','integrate']){
  const code=componentProjectCheckSource(step);new vm.Script(code);
  const preview=buildProjectPreview('<main></main>',{projectId:'component-studio',step,token:'test',check:true});
  assert.ok(preview.includes('data-component'));assert.ok(!preview.includes('club-signup'));
 }
 assert.throws(()=>componentProjectCheckSource('unknown'),/Unknown component/);
});
