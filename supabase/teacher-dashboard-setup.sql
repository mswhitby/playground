-- Run once in the existing Supabase project's SQL Editor.
-- Authorizes deoncarlette (63321092) and deandrawhitby (104539455) as teachers.
-- Preserves existing progress, drafts, and hand-ins. Adds missing submission storage.
begin;
do $setup$ begin
if to_regclass('public.playground_submissions') is null then

create table public.playground_submissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 course_id text not null check(course_id in ('computer-science-1','game-programming','mobile-app-dev','uil','capstone')),
 activity_id text not null check(char_length(activity_id) between 1 and 200),
 content_version text not null default '1' check(char_length(content_version) between 1 and 128),
 activity_kind text not null check(activity_kind in ('lesson','challenge','quiz','project','programming','self-report')),
 files jsonb not null check(jsonb_typeof(files)='object' and octet_length(files::text)<=300000),
 submitted_at timestamptz not null default now(),
 verification text not null default 'student_submission' check(verification='student_submission')
);
alter table public.playground_submissions enable row level security;
revoke all on public.playground_submissions from public,anon,authenticated;
grant select on public.playground_submissions to authenticated;
grant insert(id,user_id,course_id,activity_id,content_version,activity_kind,files) on public.playground_submissions to authenticated;
create policy playground_submissions_read_own on public.playground_submissions for select to authenticated using((select auth.uid())=user_id);
create policy playground_submissions_insert_own on public.playground_submissions for insert to authenticated with check((select auth.uid())=user_id);
-- Students cannot edit, delete, backdate, or change the owner of a hand-in.
-- A later explicit submission creates a new snapshot.
comment on table public.playground_submissions is 'Explicit student hand-ins, separate from autosaved drafts and unlimited practice checks. Browser submissions are not independently verified grades. No teacher access configured.';

end if;end $setup$;

create schema if not exists playground_private;
revoke all on schema playground_private from public,anon,authenticated;
create table playground_private.teacher_accounts(provider_id text primary key,teacher_group text not null);
insert into playground_private.teacher_accounts values('63321092','mswhitby'),('104539455','mswhitby');
create table playground_private.classes(
 id uuid primary key default gen_random_uuid(), teacher_group text not null,
 name text not null check(char_length(name) between 1 and 80),
 course_id text not null check(course_id in ('computer-science-1','game-programming','mobile-app-dev','uil','capstone')),
 join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table playground_private.members(
 class_id uuid not null references playground_private.classes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 80),
 status text not null default 'pending' check(status in ('pending','approved','removed')),
 joined_at timestamptz not null default now(),primary key(class_id,user_id)
);
create table playground_private.activity(
 user_id uuid not null references auth.users(id) on delete cascade,session_id uuid not null,
 course_id text not null,activity_id text not null check(char_length(activity_id) between 1 and 200),
 action text not null check(action in ('view','edit','run','check','submit','interact')),
 visible boolean not null,last_seen_at timestamptz not null default now(),last_interaction_at timestamptz,
 primary key(user_id,session_id)
);
create index playground_activity_recent on playground_private.activity(course_id,last_seen_at desc);
alter table playground_private.teacher_accounts enable row level security;
alter table playground_private.classes enable row level security;
alter table playground_private.members enable row level security;
alter table playground_private.activity enable row level security;
revoke all on playground_private.teacher_accounts,playground_private.classes,playground_private.members,playground_private.activity from public,anon,authenticated;

create function playground_private.teacher_group() returns text language sql stable security definer set search_path='' as $$
 select min(t.teacher_group) from playground_private.teacher_accounts t join auth.identities i on i.provider_id=t.provider_id and i.provider='github' where i.user_id=(select auth.uid())
$$;
create function playground_private.require_teacher(p_class uuid default null) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or playground_private.teacher_group() is null then raise exception 'Teacher access required' using errcode='42501';end if;
 if p_class is not null and not exists(select 1 from playground_private.classes c where c.id=p_class and c.teacher_group=playground_private.teacher_group()) then raise exception 'Class access denied' using errcode='42501';end if;
end $$;

create function public.playground_classroom_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('is_teacher',playground_private.teacher_group() is not null,'memberships',coalesce(jsonb_agg(jsonb_build_object('class_id',c.id,'name',c.name,'course_id',c.course_id,'status',m.status,'display_name',m.display_name)) filter(where c.id is not null),'[]'::jsonb)) into result from playground_private.members m join playground_private.classes c on c.id=m.class_id where m.user_id=auth.uid();
 return result;
end $$;
create function public.playground_teacher_classes() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform playground_private.require_teacher();
 return coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from playground_private.classes c where c.teacher_group=playground_private.teacher_group()),'[]'::jsonb);
end $$;
create function public.playground_create_class(p_name text,p_course text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c playground_private.classes;
begin
 perform playground_private.require_teacher();
 insert into playground_private.classes(teacher_group,name,course_id,created_by) values(playground_private.teacher_group(),trim(p_name),p_course,auth.uid()) returning * into c;
 return to_jsonb(c);
end $$;
create function public.playground_join_class(p_code text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c playground_private.classes;member playground_private.members;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into c from playground_private.classes where join_code=upper(trim(p_code));
 if not found then raise exception 'Class code not found';end if;
 insert into playground_private.members(class_id,user_id,display_name) values(c.id,auth.uid(),trim(p_name))
 on conflict(class_id,user_id) do update set display_name=excluded.display_name returning * into member;
 return jsonb_build_object('name',c.name,'status',member.status);
end $$;
create function public.playground_set_member(p_class uuid,p_student uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform playground_private.require_teacher(p_class);
 if p_status not in ('approved','removed') then raise exception 'Invalid membership status';end if;
 update playground_private.members set status=p_status where class_id=p_class and user_id=p_student;
 if not found then raise exception 'Student not found';end if;
end $$;
create function public.playground_leave_class(p_class uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 update playground_private.members set status='removed' where class_id=p_class and user_id=auth.uid();
end $$;

create function public.playground_activity_signal(p_session uuid,p_course text,p_activity text,p_action text,p_interacted boolean,p_visible boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if not exists(select 1 from playground_private.members m join playground_private.classes c on c.id=m.class_id where m.user_id=auth.uid() and m.status='approved' and c.course_id=p_course) then return false;end if;
 delete from playground_private.activity where last_seen_at<now()-interval '24 hours';
 insert into playground_private.activity(user_id,session_id,course_id,activity_id,action,visible,last_seen_at,last_interaction_at)
 values(auth.uid(),p_session,p_course,p_activity,p_action,p_visible,now(),case when p_interacted and p_visible then now() else null end)
 on conflict(user_id,session_id) do update set course_id=excluded.course_id,activity_id=excluded.activity_id,
 action=case when p_interacted or playground_private.activity.course_id<>excluded.course_id or playground_private.activity.activity_id<>excluded.activity_id then excluded.action else playground_private.activity.action end,visible=excluded.visible,last_seen_at=now(),
 last_interaction_at=case when p_interacted and p_visible then now() when playground_private.activity.course_id<>excluded.course_id or playground_private.activity.activity_id<>excluded.activity_id then null else playground_private.activity.last_interaction_at end;
 return true;
end $$;

create function public.playground_teacher_snapshot(p_class uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare course text;roster jsonb;signals jsonb;practice jsonb;checks jsonb;handins jsonb;
begin
 perform playground_private.require_teacher(p_class);
 select course_id into course from playground_private.classes where id=p_class;
 select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('github_account',(select coalesce(i.identity_data->>'user_name',i.identity_data->>'preferred_username','GitHub ID '||i.provider_id) from auth.identities i where i.user_id=m.user_id and i.provider='github' limit 1)) order by m.display_name),'[]'::jsonb) into roster from playground_private.members m where m.class_id=p_class;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into signals from playground_private.activity a join playground_private.members m on m.user_id=a.user_id and m.class_id=p_class and m.status='approved' where a.course_id=course and a.last_seen_at>now()-interval '24 hours';
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'activity_id',p.activity_id,'activity_kind',p.activity_kind,'status',p.status,'updated_at',p.updated_at)),'[]'::jsonb) into practice from public.playground_progress p join playground_private.members m on m.user_id=p.user_id and m.class_id=p_class and m.status='approved' where p.course_id=course;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into checks from(select a.user_id,count(*) as checks,max(a.recorded_at) as last_check from public.playground_attempts a join playground_private.members m on m.user_id=a.user_id and m.class_id=p_class and m.status='approved' where a.course_id=course group by a.user_id)x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into handins from(select s.id,s.user_id,s.activity_id,s.submitted_at from public.playground_submissions s join playground_private.members m on m.user_id=s.user_id and m.class_id=p_class and m.status='approved' where s.course_id=course order by s.submitted_at desc limit 200)x;
 return jsonb_build_object('server_time',now(),'roster',roster,'signals',signals,'practice',practice,'checks',checks,'submissions',handins);
end $$;
create function public.playground_teacher_submission(p_class uuid,p_submission uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform playground_private.require_teacher(p_class);
 select to_jsonb(s) into result from public.playground_submissions s join playground_private.members m on m.user_id=s.user_id and m.class_id=p_class and m.status='approved' join playground_private.classes c on c.id=m.class_id and c.course_id=s.course_id where s.id=p_submission;
 if result is null then raise exception 'Submission access denied' using errcode='42501';end if;
 return result;
end $$;

-- No anonymous execution or student access to private tables. Each intentional
-- public RPC authenticates the caller and derives teacher scope in the database.
revoke all on function playground_private.teacher_group(),playground_private.require_teacher(uuid) from public,anon,authenticated;
revoke all on function public.playground_classroom_context(),public.playground_teacher_classes(),public.playground_create_class(text,text),public.playground_join_class(text,text),public.playground_set_member(uuid,uuid,text),public.playground_leave_class(uuid),public.playground_activity_signal(uuid,text,text,text,boolean,boolean),public.playground_teacher_snapshot(uuid),public.playground_teacher_submission(uuid,uuid) from public,anon,authenticated;
grant execute on function public.playground_classroom_context(),public.playground_teacher_classes(),public.playground_create_class(text,text),public.playground_join_class(text,text),public.playground_set_member(uuid,uuid,text),public.playground_leave_class(uuid),public.playground_activity_signal(uuid,text,text,text,boolean,boolean),public.playground_teacher_snapshot(uuid),public.playground_teacher_submission(uuid,uuid) to authenticated;

commit;
select 'Teacher dashboard setup complete' as result;
