import {createClient} from '@supabase/supabase-js';
import {PLAYGROUND_SUPABASE_URL,PLAYGROUND_PUBLISHABLE_KEY,PLAYGROUND_AUTH_STORAGE_KEY} from './account-config.js';
import {assessedHistory,bestGradedSubmissions,recordedScore} from '../public/grade-results.mjs';
import {loadSubmissionHistory} from '../public/submission-history.mjs';

// The read-only integration deliberately has NO submit, sync, attendance, RPC,
// student roster, or mutation capability. Authentication reuses the existing
// session on mswhitby.com; sign-in remains on the live Playground.
function browserClient(){
  return createClient(PLAYGROUND_SUPABASE_URL,PLAYGROUND_PUBLISHABLE_KEY,{
    auth:{storageKey:PLAYGROUND_AUTH_STORAGE_KEY,flowType:'pkce',
      persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
  });
}

const chicagoDay = value => {
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date(value));
  const date = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part=>[part.type,part.value]));
  return `${date.year}-${date.month}-${date.day}`;
};

function chicagoWeek(value){
  const day=chicagoDay(value);
  const date=new Date(day+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
  return date.toISOString().slice(0,10);
}

export function mapVerifiedCs1History(rows){
  const history=rows.filter(row=>row.course_id==='computer-science-1' &&
    (row.activity_id?.startsWith('lesson:')||row.activity_id?.startsWith('challenge:')));
  const records=bestGradedSubmissions(history).flatMap(row=>{
    const score=recordedScore(row.grade);
    if(!score)return [];
    return [{id:row.activity_id,courseId:row.course_id,earned:score.points,
      possible:score.possible,gradedAt:chicagoDay(row.grade.graded_at||row.submitted_at),
      submissionId:row.id}];
  });
  // Weekly leaderboard points are positive verified increases, not repeated
  // complete scores or browser checks. Older archived lessons are included.
  const best=new Map(),weeks=new Map();
  for(const row of [...history].sort((a,b)=>Date.parse(a.grade?.graded_at||a.submitted_at)-
      Date.parse(b.grade?.graded_at||b.submitted_at))){
    const score=recordedScore(row.grade);
    if(!score)continue;
    const previous=best.get(row.activity_id)||0;
    const gain=Math.max(0,score.points-previous);
    best.set(row.activity_id,Math.max(previous,score.points));
    if(!gain)continue;
    const week=chicagoWeek(row.grade.graded_at||row.submitted_at);
    const current=weeks.get(week)||{week,earned:0,possible:0,count:0};
    current.earned+=gain;current.count++;
    // Positive gains are the only meaningful weekly metric; do not turn
    // repeated check attempts into more available points.
    weeks.set(week,current);
  }
  return {grades:records,weeklyPoints:[...weeks.values()].sort((a,b)=>b.week.localeCompare(a.week))};
}

export async function readOnlyCs1Snapshot(client=browserClient()){
  try {
    const {data:sessionData,error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(!sessionData?.session)return {status:'signed-out',grades:[],weeklyPoints:[]};
    // getUser verifies the session at the existing auth provider; user_metadata
    // is display-only and must never grant teacher/admin access.
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError)throw userError;
    const user=userData?.user;
    if(!user?.id)throw Error('Session could not be verified');
    const raw=await loadSubmissionHistory(client,user.id);
    const assessed=await assessedHistory(client,raw);
    return {status:'signed-in',
      user:{id:user.id,handle:String(user.user_metadata?.user_name||
        user.user_metadata?.preferred_username||'GitHub student')},
      ...mapVerifiedCs1History(assessed)};
  }catch{
    return {status:'unavailable',grades:[],weeklyPoints:[],
      message:'Could not securely load this account. Your production data has not been changed.'};
  }
}
