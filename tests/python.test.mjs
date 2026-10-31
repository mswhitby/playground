import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {readFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {harness,normalize} from '../public/python-checks.mjs';
import {PythonRunner} from '../public/python-runner.mjs';
import {pythonStorage,pythonHref} from '../public/python.mjs';
test('Python retains existing account draft and activity identities',()=>{
 assert.deepEqual(pythonStorage('lesson','06-iteration/04-build-launch-countdown'),{activity:'lesson:06-iteration/04-build-launch-countdown',prefix:'cs1:guided:v1:'});
 assert.deepEqual(pythonStorage('challenge','bot-spammer'),{activity:'challenge:bot-spammer',prefix:'cs1:challenges:2026-10-26:'});
 assert.match(pythonHref('lesson','01-how-programs-work/01-first-message'),/%2F/);
});
function check(source,call,expected){const output=execFileSync('python3',['-c',harness(source,[{call,expected}])],{encoding:'utf8'});return JSON.parse(output.split('UNIT_TEST_RESULTS=')[1])[0]}
test('actual Python evaluation distinguishes correct values, wrong types, exceptions and legacy names',()=>{
 assert.equal(check('def total(a,b): return a+b','total(2,3)','5').ok,true);
 assert.equal(check('def total(a,b): return str(a+b)','total(2,3)','5').ok,false);
 assert.equal(check('def total(a,b): return True','total(2,3)','1').ok,false);
 assert.match(check('def total(a,b): raise ValueError("try again")','total(2,3)','5').error,/ValueError/);
 assert.equal(check('def solution(a,b): return a+b','total(2,3)','5').ok,true);
 assert.equal(normalize('Ready.\r\n'),'Ready.');
});
test('subject snapshot packages every original lesson, challenge and unchanged Pyodide worker',()=>{
 const temp=mkdtempSync(join(tmpdir(),'playground-python-'));
 try{execFileSync('node',['scripts/package-python.mjs','../computer-science-1',temp]);const c=JSON.parse(readFileSync(join(temp,'course.json'),'utf8'));assert.equal(c.lessons.length,24);assert.equal(c.challenges.length,24);assert.equal(new Set(c.lessons.map(l=>l.id)).size,24);
 for(const l of c.lessons)assert.equal(readFileSync(join(temp,'units',l.markdown),'utf8'),readFileSync(join('../computer-science-1/units',l.markdown),'utf8'));
 assert.equal(readFileSync(join(temp,'python-worker.js'),'utf8'),readFileSync('../computer-science-1/docs/python-worker.js','utf8'));
 }finally{rmSync(temp,{recursive:true,force:true})}
});
globalThis.document={baseURI:'https://example.test/playground/'};
function factory({delay=0,neverReady=false,neverRespond=false}={}){const workers=[];return {workers,create(){const worker={terminated:false,terminate(){this.terminated=true},postMessage(message){if(!neverRespond)setTimeout(()=>this.onmessage({data:{type:'result',id:message.id,success:true,output:'real protocol'}}),delay)}};workers.push(worker);if(!neverReady)queueMicrotask(()=>worker.onmessage({data:{type:'ready'}}));return worker}}}
test('Python runner executes the canonical worker protocol and can restart after Stop',async()=>{const f=factory(),r=new PythonRunner({workerFactory:()=>f.create()});assert.equal((await r.run('print(1)')).output,'real protocol');r.stop();assert.equal(f.workers[0].terminated,true);assert.equal((await r.run('print(2)')).success,true);r.dispose();await assert.rejects(r.run('print(3)'),/closed/)});
test('Stop cancels an in-flight Python run without producing a result',async()=>{const f=factory({neverRespond:true}),r=new PythonRunner({workerFactory:()=>f.create()});await r.init();const pending=r.run('while True: pass');await Promise.resolve();r.stop();await assert.rejects(pending,/stopped/);assert.equal(f.workers[0].terminated,true);r.dispose()});
test('Python load and execution timeouts terminate workers',async()=>{const f=factory({neverReady:true}),r=new PythonRunner({workerFactory:()=>f.create(),loadTimeout:5});await assert.rejects(r.run('print(1)'),/load in time/);assert.equal(f.workers[0].terminated,true);r.dispose();const g=factory({neverRespond:true}),s=new PythonRunner({workerFactory:()=>g.create(),runTimeout:5});await assert.rejects(s.run('while True: pass'),/timed out/);assert.equal(g.workers[0].terminated,true);s.dispose()});
