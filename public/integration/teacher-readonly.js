// Teacher-only read adapter for the isolated React integration.
// Existing RLS/SECURITY DEFINER permission checks remain authoritative.
// RPC uses HTTP POST by Supabase convention but invokes ONLY stable read functions.
const ROOT='https://lndzhmwvooqfrqcafhut.supabase.co';
const KEY='sb_publishable_o5PgBG-pF2GzPZxTv4oRmA_s0OeJ9OM';
const READ_RPC=new Set([
 'playground_classroom_context','playground_teacher_classes',
 'playground_teacher_snapshot','playground_teacher_weekly_points',
 'playground_teacher_student_history'
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function tokenFrom(storage,now){
 let session;
 try{session=JSON.parse(storage?.getItem('playground-auth-v1')||'null')}catch{return null}
 if(typeof session?.access_token!=='string'||!session.access_token)return null;
 if(session.expires_at&&Number(session.expires_at)*1000<=now)return null;
 return session.access_token;
}
async function readJson(path,token,fetchImpl,signal,body){
 const headers={apikey:KEY,Authorization:'Bearer '+token,Accept:'application/json'};
 const opts={method:body===undefined?'GET':'POST',headers,cache:'no-store',signal};
 if(body!==undefined){headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
 const response=await fetchImpl(ROOT+path,opts);
 if(!response.ok)throw Error('Teacher data unavailable ('+response.status+').');
 return response.json();
}
export async function teacherReadOnlyClient({
 storage=(typeof window==='undefined'?null:window.localStorage),
 fetchImpl=fetch,now=Date.now(),signal
}={}){
 const token=tokenFrom(storage,now);
 if(!token)return {status:'signed-out'};
 try{
  const user=await readJson('/auth/v1/user',token,fetchImpl,signal);
  if(!user?.id||!UUID.test(user.id))throw Error('Account not verified.');
  const rpc=async(name,args={})=>{
   if(!READ_RPC.has(name))throw Error('Read-only teacher integration: operation not allowed.');
   if((name==='playground_teacher_snapshot'||name==='playground_teacher_weekly_points')&&!UUID.test(args.p_class||''))throw Error('Invalid section.');
   if(name==='playground_teacher_student_history'&&(!UUID.test(args.p_class||'')||!UUID.test(args.p_student||'')))throw Error('Invalid student or section.');
   return readJson('/rest/v1/rpc/'+name,token,fetchImpl,signal,args);
  };
  const context=await rpc('playground_classroom_context');
  if(context?.is_teacher!==true)return {status:'forbidden'};
  const classes=await rpc('playground_teacher_classes');
  if(!Array.isArray(classes))throw Error('Invalid section response.');
  return {status:'ready',classes:classes.map(c=>({id:c.id,name:c.name,course_id:c.course_id,join_code:c.join_code||null})),rpc};
 }catch(error){
  if(signal?.aborted)throw error;
  return {status:'unavailable',message:'Teacher data could not be loaded. No records were changed.'};
 }
}
export function teacherRosterRows(snapshot,weekly,week){
 const roster=Array.isArray(snapshot?.roster)?snapshot.roster.filter(r=>r.status==='approved'):[];
 const points=new Map((weekly?.weeks||[]).filter(r=>r.week_start===week).map(r=>[r.user_id,r]));
 const checks=new Map((snapshot?.checks||[]).map(r=>[r.user_id,r]));
 return roster.map(r=>({
  id:r.user_id,
  name:r.display_name||r.github_account||'Student',
  github:r.github_account||'',
  checks:Number(checks.get(r.user_id)?.checks)||0,
  points:Number(points.get(r.user_id)?.points)||0,
  improved:Number(points.get(r.user_id)?.assignments)||0
 })).sort((a,b)=>a.name.localeCompare(b.name));
}
