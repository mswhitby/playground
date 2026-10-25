import {ClassroomClient} from '../public/classroom-client.mjs';
import {SubmissionService,mountSubmission} from '../public/submissions.mjs';
import {createClient} from '@supabase/supabase-js';
import {AccountCache,describeKey,acceptedProgress} from '../public/account-model.mjs';
import {PracticeSync} from '../public/account-sync.mjs';
const PROJECT_URL='https://lndzhmwvooqfrqcafhut.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_o5PgBG-pF2GzPZxTv4oRmA_s0OeJ9OM';
const callback=location.origin+'/playground/auth-callback.html';
const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{storageKey:'playground-auth-v1',flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})}});
let user=null,sync=null,cache=null,submissions=null,classroom=null,status='Checking your account…',hydrated=false,leaving=false;
const native=(()=>{try{const s=localStorage;s.getItem('playground-storage-check');return s}catch{
 const values=new Map();return {get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
}})();
const safeReturn=value=>{try{const u=new URL(value,location.origin);if(u.origin===location.origin&&(u.pathname.startsWith('/playground/')||u.pathname.startsWith('/computer-science-1/')))return u.pathname+u.search+u.hash}catch{}return '/playground/'};
const backupDownload=()=>{
 const payload={savedAt:new Date().toISOString(),changes:sync?.queue||[]};
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=url;a.download='playground-unsynced-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function update(message){if(message)status=message;render();document.dispatchEvent(new Event('playground-account-status'))}
const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='btn btn-outline-primary';b.textContent=label;b.onclick=action;return b};
function mount(){
 const target=document.querySelector('#account-menu,.material-preferences>div');if(!target)return;
 let panel=target.querySelector('.account-sync-panel');if(!panel){panel=document.createElement('section');panel.className='account-sync-panel';panel.setAttribute('aria-label','Your Playground account');target.prepend(panel)}
 return panel;
}
function render(){
 const panel=mount();if(!panel)return;panel.replaceChildren();
 const who=document.createElement('strong');who.textContent=user?'Signed in as '+(user.user_metadata?.user_name||user.user_metadata?.preferred_username||'GitHub student'):'Your Playground account';panel.append(who);
 const message=document.createElement('p');message.setAttribute('role','status');message.textContent=status;panel.append(message);
 if(!hydrated)return;
 if(!user){panel.append(button('Sign in with GitHub',signIn));return}
 const classLink=document.createElement('a');classLink.href='/playground/#/classes';classLink.textContent='My classes';panel.append(classLink);
 if(classroom?.context.memberships.some(m=>m.status==='approved')){const shared=document.createElement('p');shared.textContent='Recent activity on class activities is shared with your approved class teacher. Manage this in My classes.';panel.append(shared)}
 if(classroom?.context.is_teacher){const teacher=document.createElement('a');teacher.href='/playground/#/teacher';teacher.textContent='Teacher dashboard';panel.append(teacher)}
 panel.append(button('Sync now',()=>sync?.flush()),button('Sign out',signOut));
 if(cache.guestKeys().length)panel.append(button('Import my guest work',importGuest));
 if(sync?.queue.length)panel.append(button('Download unsynced backup',backupDownload));
 for(const task of sync?.conflicts||[]){
  const box=document.createElement('div');box.className='draft-conflict';
  const label=document.createElement('p');label.textContent='Draft conflict: '+task.row.activity_id;box.append(label);
  for(const [label,keep] of [['Keep this device copy',true],['Use cloud copy',false]])box.append(button(label,async()=>{
   if(!confirm(keep?'Replace the cloud draft with this device’s copy? A backup of both copies stays on this device.':'Use the cloud draft? A backup of both copies stays on this device.'))return;
   try{await sync.resolve(task,keep);location.reload()}catch{update('The conflict could not be resolved. Both copies are still preserved.')}
  }));panel.append(box);
 }
}
async function signIn(){
 await sync?.flush();try{sessionStorage.setItem('playground-return-to',safeReturn(location.href))}catch{}
 update('Opening GitHub sign-in…');
 const {error}=await client.auth.signInWithOAuth({provider:'github',options:{redirectTo:callback}});
 if(error)update('Sign-in could not start. Please try again.');
}
async function signOut(){
 await sync?.flush();if(sync?.queue.length){if(!confirm('Some changes have not synced. Download a backup and sign out? Cancel to keep working.'))return;backupDownload()}
 leaving=true;sync?.dispose();
 const {error}=await client.auth.signOut({scope:'local'});
 if(error){leaving=false;update('Sign-out could not finish. Please retry before leaving this computer.');return}
 cache.clearAccount();
 const uid=user?.id;if(uid){for(const key of cache.keys())if(key==='playground:pending:'+uid||key.startsWith('playground:backup:'+uid+':'))native.removeItem(key)}
 location.reload();
}
async function importGuest(){
 if(!user||!confirm('Import this browser’s guest practice and drafts into your account? Only continue if this guest work is yours. Existing account work will be kept.'))return;
 for(const key of cache.guestKeys()){
  const raw=native.getItem(key);if(raw===null)continue;
  if(key==='playground:progress:v1'){
   let guest,own;try{guest=JSON.parse(raw);own=JSON.parse(cache.getItem(key)||'{}')}catch{continue}
   cache.setItem(key,JSON.stringify({...guest,...own}));
  }else if(cache.getItem(key)===null)cache.setItem(key,raw);
 }
 await sync.flush();location.reload();
}
function summaries(){
 if(user)return [...sync?.progress.values()||[]].map(row=>({course:row.course_id,activity:row.activity_id,kind:row.activity_kind,status:row.status,updatedAt:row.updated_at||''}));
 return [];
}
export const Account={
 get classroom(){return classroom},get user(){return user},get status(){return status},get signedIn(){return !!user},get pending(){return sync?.queue.length||0},get storage(){return cache||native},
 signIn,signOut,summaries,
 async submissionHistory(){
  if(!user)return [];
  const {data,error}=await client.from('playground_submissions').select('id,course_id,activity_id,submitted_at').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(100);
  if(error)throw error;return data;
 },
 mountSubmission(options){classroom?.setActivity(options.course_id,options.activity_id);return mountSubmission({...options,signedIn:()=>!!user,signIn,submit:async snapshot=>{if(!submissions)throw Error('Sign in before submitting work.');const receipt=await submissions.submit(snapshot);classroom?.signalSubmission();return receipt}})},
 recordAttempt(course,activity,kind,result){if(user&&sync)sync.attempt(course,activity,kind,result)},
 recordProject(id,step,results){const key='playground:mobile-project-check:'+id+':'+step;Account.storage.setItem(key,JSON.stringify({passed:results.every(r=>r.pass),passedCases:results.filter(r=>r.pass).length,totalCases:results.length,updatedAt:new Date().toISOString()}))},
 async flush(){await sync?.flush()}
};
window.PlaygroundAccount=Account;
async function start(){
 if(location.pathname.endsWith('/auth-callback.html')){
  const code=new URL(location.href).searchParams.get('code');
  if(code){
   const {error}=await client.auth.exchangeCodeForSession(code);history.replaceState(null,'',location.pathname);
   if(!error){let back='/playground/';try{back=safeReturn(sessionStorage.getItem('playground-return-to'));sessionStorage.removeItem('playground-return-to')}catch{}location.replace(back);return}
  }
  const state=document.getElementById('auth-callback-status');if(state)state.textContent='Sign-in could not finish. Return to the Playground and try again. If this repeats, check the Supabase return URL settings.';return;
 }
 const {data,error}=await client.auth.getSession();user=error?null:data.session?.user||null;
 cache=new AccountCache(native,user?.id||null,(...args)=>sync?.write(...args));
 classroom=new ClassroomClient(client,Account);const classroomReady=classroom.start();
 if(user){
  submissions=new SubmissionService(client,user.id);
  try{sync=new PracticeSync({client,cache,userId:user.id,storage:native,onStatus:update});await sync.hydrate()}
  catch{status='Signed in. Cloud sync is unavailable; your account work stays on this device.'}
 }else status='Sign in to keep practice and drafts across computers. Guest work stays on this device.';
 await classroomReady;
 hydrated=true;render();
 client.auth.onAuthStateChange((_event,session)=>{if(!leaving&&(session?.user?.id||null)!==(user?.id||null)){leaving=true;document.body.inert=true;setTimeout(()=>location.reload(),0)}});
 window.addEventListener('online',()=>sync?.flush());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')sync?.flush()});
 document.addEventListener('DOMContentLoaded',render,{once:true});
 new MutationObserver(()=>{if(!document.querySelector('.account-sync-panel'))render()}).observe(document.body,{childList:true,subtree:true});
 document.dispatchEvent(new Event('playground-account-ready'));
}
export const ready=start().catch(()=>{cache=new AccountCache(native,user?.id||null);hydrated=true;status='Account tools could not start. Guest work is available on this device.';render()});
