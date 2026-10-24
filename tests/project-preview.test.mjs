import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildProjectPreview,projectCheckSource} from '../public/project-preview.mjs';

test('project preview preserves original code and installs error capture before student scripts',()=>{
 const source='<!doctype html><html><head><script>throw new Error("student error")</script></head><body><h1>Club news</h1></body></html>';
 const html=buildProjectPreview(source,{token:'preview-1',step:'structure'});
 assert(html.indexOf('window.onerror')<html.indexOf('throw new Error'));
 assert(html.includes('<script>throw new Error("student error")</script>'));
 assert(html.includes('form-action &apos;none&apos;'));
 assert(!html.includes('project-checks'));
});
test('incomplete project pages return failed requirements rather than checker errors',async()=>{
 const messages=[];
 const context={document:{querySelector:()=>null,querySelectorAll:()=>[]},send:(kind,details)=>messages.push({kind,...details})};
 await vm.runInNewContext(projectCheckSource('structure'),context);
 assert.equal(messages.length,1);assert.equal(messages[0].kind,'project-checks');assert.equal(messages[0].results.length,4);assert(messages[0].results.every(r=>r.pass===false));
});
test('only known project checkpoints can be run',()=>{
 for(const step of ['structure','style','interaction','test'])new vm.Script(projectCheckSource(step));
 assert.throws(()=>projectCheckSource('unknown'));
 assert.throws(()=>buildProjectPreview('html',{step:'structure'}));
});
