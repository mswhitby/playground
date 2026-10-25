import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountCache,describeKey,draftKey,progressRow} from '../public/account-model.mjs';
import {PracticeSync} from '../public/account-sync.mjs';
class Store{map=new Map();get length(){return this.map.size}key(i){return [...this.map.keys()][i]}getItem(k){return this.map.get(k)??null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const row=(source_code='local')=>({user_id:'a',course_id:'uil',activity_id:'loops',file_name:'main',source_code});
function setup(){const storage=new Store(),cache=new AccountCache(storage,'a');const sync=new PracticeSync({client:{},cache,userId:'a',storage});return {sync,cache,storage}}
test('guest work and two student accounts stay separate; appearance stays shared',()=>{
 const s=new Store(),guest=new AccountCache(s),a=new AccountCache(s,'a'),b=new AccountCache(s,'b'),key='playground:draft:mobile-app-dev:html';
 guest.setItem(key,'guest');a.setItem(key,'A');b.setItem(key,'B');a.setItem('appearance','dark');
 assert.equal(guest.getItem(key),'guest');assert.equal(a.getItem(key),'A');assert.equal(b.getItem(key),'B');assert.equal(b.getItem('appearance'),'dark');a.clearAccount();assert.equal(b.getItem(key),'B');assert.equal(guest.getItem(key),'guest');
});
test('every draft binding round trips without accepting auth keys',()=>{
 for(const key of ['playground:draft:game-programming:hello','playground:quiz-answers:game-programming:quiz','playground:draft:mobile-app-dev:project:club-connect','playground:uil:draft:loop','playground:uil:written-answers','cs1:guided:v1:draft:hello','cs1:challenges:2026-10-26:draft:hello'])assert.equal(draftKey(describeKey(key)),key);
 const {cache}=setup();cache.hydrateProgress({user_id:'a',course_id:'uil',activity_id:'loops',content_version:'1',practice_data:{storage_key:'playground-auth-v1',raw:'forged'}});assert.equal(cache.getItem('playground-auth-v1'),null);
});
test('pending drafts retain their original revision when edited after remote hydration',()=>{
 const {sync}=setup();sync.enqueue('draft',row(),2);sync.revisions.set('uil|loops|main',8);sync.enqueue('draft',row('changed'),8);assert.equal(sync.queue[0].expected,2);sync.conflicts=[sync.queue[0]];sync.enqueue('draft',row('again'),8);assert.equal(sync.conflicts[0].id,sync.queue[0].id);assert.equal(sync.queue[0].expected,2);sync.dispose();
});
test('retry of an acknowledged-lost draft write accepts identical server contents',async()=>{
 const {sync}=setup();let n=0;sync.client={from(){const q={insert(){return q},select(){return q},eq(){return q},single(){return Promise.resolve({data:{...row(),revision:4}})},then(resolve){return Promise.resolve({error:{code:'23505'}}).then(resolve)}};return q}};
 assert.deepEqual(await sync.saveDraft({row:row(),expected:0}),{revision:4});
 sync.client={from(){const q={insert(){return q},select(){return q},eq(){return q},single(){return Promise.resolve({data:{...row('remote'),revision:4}})},then(resolve){return Promise.resolve({error:{code:'23505'}}).then(resolve)}};return q}};
 assert.deepEqual(await sync.saveDraft({row:row(),expected:0}),{conflict:true});
});
test('flush waits for in-flight requests and keeps failed requests for retry',async()=>{
 const {sync}=setup();let finish;sync.saveDraft=()=>new Promise(resolve=>{finish=resolve});sync.enqueue('draft',row(),0);const first=sync.flush(),second=sync.flush();assert.equal(first,second);finish({revision:1});await second;assert.equal(sync.queue.length,0);
 sync.saveDraft=async()=>{throw Error('offline')};sync.enqueue('draft',row('new'),1);await sync.flush();assert.equal(sync.queue.length,1);sync.dispose();
});
test('queue cannot write data attributed to a different account',async()=>{
 const {sync}=setup();sync.enqueue('draft',{...row(),user_id:'b'},0);let called=false;sync.saveDraft=async()=>{called=true};await sync.flush();assert.equal(called,false);assert.equal(sync.queue.length,1);sync.dispose();
});
test('server progress only restores the corresponding activity',()=>{
 const {cache}=setup();const r=progressRow('a','playground:uil:check:loops',JSON.stringify({passed:true}));cache.hydrateProgress({...r,activity_id:'other'});assert.equal(cache.getItem('playground:uil:check:loops'),null);cache.hydrateProgress(r);assert.equal(JSON.parse(cache.getItem('playground:uil:check:loops')).passed,true);
});
