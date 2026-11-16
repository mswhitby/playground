/**
 * Canonical, read-only production account adapter for the isolated React CS1 build.
 * No Supabase client initialization, OAuth callbacks, RPCs, localStorage writes,
 * draft sync, submissions, or database mutations happen in this module.
 * It reads only the already signed-in user's records under existing Supabase RLS.
 */
const ROOT='https://lndzhmwvooqfrqcafhut.supabase.co';
const KEY='sb_publishable_o5PgBG-pF2GzPZxTv4oRmA_s0OeJ9OM';
const STORAGE_KEY='playground-auth-v1';
const COURSE='computer-science-1';
const FIELDS='submission_id,status,points,possible,scope,graded_at';
const ALLOWED_SCOPES=new Set(['grader_tests','published_tests','teacher']);

function existingToken(storage,now=Date.now()){
 let session=null;
 try{session=JSON.parse(storage?.getItem(STORAGE_KEY)||'null')}catch{return null}
 if(typeof session?.access_token!=='string'||!session.access_token)return null;
 // Do not refresh a production token from a preview. Sign in via the live site.
 if(session.expires_at && Number(session.expires_at)*1000<=now)return null;
 return session.access_token;
}
function url(path,parameters={}){
 const output=new URL(path,ROOT);
 for(const [key,value] of Object.entries(parameters))output.searchParams.set(key,String(value));
 return output.toString();
}
async function get(path,parameters,token,fetchImpl,signal){
 const response=await fetchImpl(url(path,parameters),{method:'GET',signal,cache:'no-store',
  headers:{Accept:'application/json',apikey:KEY,Authorization:'Bearer '+token}});
 if(!response.ok)throw Error('Read-only account request failed ('+response.status+').');
 return response.json();
}
function score(g){
 if(g?.status!=='graded'||!ALLOWED_SCOPES.has(g.scope)||!Number.isFinite(g.points)||
 !Number.isFinite(g.possible)||g.possible<=0||g.points<0||g.points>g.possible)return null;
 return g.points;
}
function chicagoParts(timestamp){
 const d=new Date(timestamp);
 if(!Number.isFinite(d.getTime()))return null;
 return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d)
  .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function centralDate(timestamp){
 const parts=chicagoParts(timestamp);
 return parts?parts.year+'-'+parts.month+'-'+parts.day:null;
}
function centralWeek(timestamp){
 const p=chicagoParts(timestamp);
 if(!p)return null;
 const d=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
}
export function verifiedCs1Snapshot(submissions,gradeRecords){
 const byId=new Map(gradeRecords.map(g=>[g.submission_id,g]));
 const history=[...submissions].filter(s=>s?.course_id===COURSE &&
 typeof s.activity_id==='string' && /^(lesson|challenge):/.test(s.activity_id))
 .sort((a,b)=>Date.parse(a.submitted_at)-Date.parse(b.submitted_at)||String(a.id).localeCompare(String(b.id)));
 const best=new Map(),previous=new Map(),weekly=new Map();
 for(const s of history){
  const g=byId.get(s.id),points=score(g);
  if(points===null)continue;
  const prior=previous.get(s.activity_id)||0;
  const delta=Math.max(0,points-prior);
  previous.set(s.activity_id,Math.max(prior,points));
  const date=centralDate(g.graded_at||s.submitted_at);
  if(!date)continue;
  const current=best.get(s.activity_id);
  if(!current||points>current.earned)best.set(s.activity_id,{
   id:s.activity_id,courseId:COURSE,earned:points,possible:g.possible,gradedAt:date});
  const week=centralWeek(s.submitted_at);
  if(!week||!delta)continue;
  if(!weekly.has(week))weekly.set(week,{week,earned:0,activities:new Set()});
  const row=weekly.get(week);
  row.earned+=delta;row.activities.add(s.activity_id);
 }
 return {grades:[...best.values()],weeklyPoints:[...weekly.values()]
  .map(w=>({week:w.week,earned:Math.round(w.earned*100)/100,count:w.activities.size}))
  .sort((a,b)=>b.week.localeCompare(a.week))};
}
export async function readOnlyCs1Snapshot({
 storage=(typeof window==='undefined'?null:window.localStorage),
 fetchImpl=fetch,signal,now=Date.now()}={}){
 const empty={grades:[],weeklyPoints:[]},token=existingToken(storage,now);
 if(!token)return {status:'signed-out',...empty};
 try{
  // Identity comes from /auth/v1/user, never user-editable browser metadata.
  const user=await get('/auth/v1/user',{},token,fetchImpl,signal);
  if(typeof user?.id!=='string'||!user.id)throw Error('Account identity not verified.');
  const submissions=[];
  for(let offset=0;offset<20000;offset+=200){
   const batch=await get('/rest/v1/playground_submissions',{
    select:'id,course_id,activity_id,submitted_at',user_id:'eq.'+user.id,
    course_id:'eq.'+COURSE,order:'submitted_at.asc,id.asc',limit:200,offset
   },token,fetchImpl,signal);
   if(!Array.isArray(batch))throw Error('Invalid read-only submission response.');
   submissions.push(...batch);
   if(batch.length<200)break;
   if(offset===19800)throw Error('History too large for this test build.');
  }
  const grades=[];
  for(let i=0;i<submissions.length;i+=80){
   const ids=submissions.slice(i,i+80).map(s=>s.id).filter(id=>
    typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id));
   if(!ids.length)continue;
   const batch=await get('/rest/v1/playground_grades',{
    select:FIELDS,submission_id:'in.('+ids.join(',')+')'
   },token,fetchImpl,signal);
   if(!Array.isArray(batch))throw Error('Invalid read-only grades response.');
   grades.push(...batch);
  }
  return {status:'signed-in',user:{handle:String(
   user.user_metadata?.user_name||user.user_metadata?.preferred_username||'GitHub account').slice(0,60)},
   ...verifiedCs1Snapshot(submissions,grades)};
 }catch(error){
  if(signal?.aborted)throw error;
  return {status:'unavailable',message:'Could not retrieve your verified results. No production data changed.',...empty};
 }
}
