-- Manual class assignments, shared by every subject playground.
-- Run after 202610260004_auto_join.sql. No change to course repositories.
-- Existing GitHub users enroll immediately; others are matched at first sign-in.
begin;

alter table playground_private.members
 add column if not exists teacher_assigned boolean not null default false;

create table playground_private.queued_assignments (
 class_id uuid not null references playground_private.classes(id) on delete cascade,
 username_key text not null,
 username text not null,
 assigned_by uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key(class_id,username_key)
);
alter table playground_private.queued_assignments enable row level security;
revoke all on playground_private.queued_assignments from public,anon,authenticated;

-- A verified GitHub sign-in resolves queued usernames without requiring a join code.
-- Preserve explicit removals: a student's own Leave or teacher removal still wins.
create or replace function public.playground_classroom_context()
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 result jsonb;
 account_name text;
 requested record;
 matching_accounts integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select coalesce(nullif(i.identity_data->>'user_name',''),
                 nullif(i.identity_data->>'preferred_username',''))
 into account_name
 from auth.identities i where i.user_id=auth.uid() and i.provider='github'
 limit 1;
 if account_name is not null then
  select count(*) into matching_accounts from auth.identities i
  where i.provider='github' and lower(coalesce(
    nullif(i.identity_data->>'user_name',''),
    nullif(i.identity_data->>'preferred_username',''),''))=lower(account_name);
  if matching_accounts=1 then
   for requested in select q.class_id from playground_private.queued_assignments q
    where q.username_key=lower(account_name)
   loop
    insert into playground_private.members(class_id,user_id,display_name,status,teacher_assigned)
    values(requested.class_id,auth.uid(),account_name,'approved',true)
    on conflict(class_id,user_id) do update
    set status=case when playground_private.members.status='removed'
      then 'removed' else 'approved' end;
    delete from playground_private.queued_assignments q
    where q.class_id=requested.class_id and q.username_key=lower(account_name);
   end loop;
  end if;
 end if;
 select jsonb_build_object('is_teacher',playground_private.teacher_group() is not null,
  'memberships',coalesce(jsonb_agg(jsonb_build_object(
   'class_id',c.id,'name',c.name,'course_id',c.course_id,
   'status',m.status,'display_name',m.display_name,
   'teacher_assigned',m.teacher_assigned
  )) filter(where c.id is not null),'[]'::jsonb))
 into result from playground_private.members m
 join playground_private.classes c on c.id=m.class_id where m.user_id=auth.uid();
 return result;
end $$;

-- Provide comma, newline, or space-separated usernames in the browser; RPC
-- accepts an array of up to 100 handles and reports each result independently.
create function public.playground_teacher_assign_students(p_class uuid,p_usernames text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 raw_username text;
 requested text;
 normalized text;
 v_display_name text;
 seen text[] := array[]::text[];
 student_id uuid;
 matches integer;
 existing_status text;
 state text;
 results jsonb := '[]'::jsonb;
begin
 perform playground_private.require_teacher(p_class);
 if p_usernames is null or cardinality(p_usernames) not between 1 and 100 then
  raise exception 'Enter between 1 and 100 GitHub usernames';
 end if;
 foreach raw_username in array p_usernames loop
  requested:=regexp_replace(trim(coalesce(raw_username,'')),'^@','');
  normalized:=lower(requested);
  if normalized=any(seen) then continue;end if;
  seen:=array_append(seen,normalized);
  if length(requested) not between 1 and 39 or
     requested !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$' then
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status','invalid'));
   continue;
  end if;
  -- Match only identities returned by GitHub, never editable account metadata.
  select count(*),min(i.user_id::text)::uuid into matches,student_id
  from auth.identities i
  where i.provider='github' and lower(coalesce(
   nullif(i.identity_data->>'user_name',''),
   nullif(i.identity_data->>'preferred_username',''),''))=normalized;
  if matches>1 then
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status','ambiguous'));
   continue;
  elsif matches=0 then
   insert into playground_private.queued_assignments(class_id,username_key,username,assigned_by)
   values(p_class,normalized,requested,auth.uid())
   on conflict(class_id,username_key) do nothing;
   state:=case when found then 'queued' else 'already_queued' end;
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status',state));
   continue;
  end if;
  select coalesce(nullif(i.identity_data->>'user_name',''),
                  nullif(i.identity_data->>'preferred_username',''),requested)
  into v_display_name from auth.identities i
  where i.user_id=student_id and i.provider='github' limit 1;
  select m.status into existing_status from playground_private.members m
  where m.class_id=p_class and m.user_id=student_id;
  if not found then
   insert into playground_private.members(class_id,user_id,display_name,status,teacher_assigned)
   values(p_class,student_id,v_display_name,'approved',true);
   state:='enrolled';
  elsif existing_status='removed' then
   state:='removed';
  else
   update playground_private.members
   set status='approved',display_name=v_display_name,teacher_assigned=true
   where class_id=p_class and user_id=student_id;
   state:=case when existing_status='approved' then 'already_enrolled' else 'enrolled' end;
  end if;
  delete from playground_private.queued_assignments q
  where q.class_id=p_class and q.username_key=normalized;
  results:=results||jsonb_build_array(jsonb_build_object('username',v_display_name,'status',state));
 end loop;
 return results;
end $$;

-- Show the teacher usernames awaiting their first verified Playground login.
create function public.playground_teacher_queued_assignments(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform playground_private.require_teacher(p_class);
 return coalesce((select jsonb_agg(jsonb_build_object(
   'username',q.username,'assigned_at',q.assigned_at
 ) order by q.assigned_at) from playground_private.queued_assignments q
 where q.class_id=p_class),'[]'::jsonb);
end $$;

create function public.playground_teacher_cancel_assignment(p_class uuid,p_username text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform playground_private.require_teacher(p_class);
 delete from playground_private.queued_assignments q
 where q.class_id=p_class and q.username_key=lower(trim(p_username));
 if not found then raise exception 'Queued assignment not found';end if;
end $$;

revoke all on function public.playground_teacher_assign_students(uuid,text[]),
 public.playground_teacher_queued_assignments(uuid),
 public.playground_teacher_cancel_assignment(uuid,text)
 from public,anon,authenticated;
grant execute on function public.playground_teacher_assign_students(uuid,text[]),
 public.playground_teacher_queued_assignments(uuid),
 public.playground_teacher_cancel_assignment(uuid,text)
 to authenticated;
commit;
