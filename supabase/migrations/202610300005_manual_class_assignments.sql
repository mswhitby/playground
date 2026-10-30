-- Teacher-selected class rosters. Apply after the classroom and auto-join migrations.
-- A student must have signed in with GitHub at least once to resolve their provider identity.
-- Teacher assignments remain pending until the student accepts activity sharing.
begin;

alter table playground_private.members
  add column if not exists teacher_assigned boolean not null default false;

create or replace function public.playground_classroom_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then
  raise exception 'Sign in required' using errcode='42501';
 end if;
 select jsonb_build_object(
  'is_teacher',playground_private.teacher_group() is not null,
  'memberships',coalesce(jsonb_agg(jsonb_build_object(
   'class_id',c.id,'name',c.name,'course_id',c.course_id,
   'status',m.status,'display_name',m.display_name,
   'teacher_assigned',m.teacher_assigned
  )) filter (where c.id is not null),'[]'::jsonb)
 ) into result
 from playground_private.members m
 join playground_private.classes c on c.id=m.class_id
 where m.user_id=auth.uid();
 return result;
end $$;

create function public.playground_teacher_assign_students(p_class uuid,p_usernames text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 raw_username text;
 requested text;
 canonical_name text;
 normalized text;
 seen text[] := array[]::text[];
 student_id uuid;
 matches integer;
 member playground_private.members%rowtype;
 state text;
 results jsonb := '[]'::jsonb;
begin
 perform playground_private.require_teacher(p_class);
 if p_usernames is null or cardinality(p_usernames) not between 1 and 100 then
  raise exception 'Enter between 1 and 100 GitHub usernames';
 end if;
 foreach raw_username in array p_usernames loop
  requested:=trim(coalesce(raw_username,''));
  requested:=regexp_replace(requested,'^@','');
  normalized:=lower(requested);
  if normalized=any(seen) then continue; end if;
  seen:=array_append(seen,normalized);
  if length(requested) not between 1 and 39 or
     requested !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$' then
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status','invalid'));
   continue;
  end if;
  -- Only verified GitHub provider identities; never editable user metadata.
  select count(*), min(i.user_id::text)::uuid into matches,student_id
  from auth.identities i
  where i.provider='github' and lower(coalesce(
   nullif(i.identity_data->>'user_name',''),
   nullif(i.identity_data->>'preferred_username',''),
   ''
  ))=normalized;
  if matches=0 then
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status','not_found'));
   continue;
  elsif matches>1 then
   results:=results||jsonb_build_array(jsonb_build_object('username',requested,'status','ambiguous'));
   continue;
  end if;
  select coalesce(nullif(i.identity_data->>'user_name',''),
                  nullif(i.identity_data->>'preferred_username',''),requested)
  into canonical_name
  from auth.identities i where i.user_id=student_id and i.provider='github' limit 1;

  select * into member from playground_private.members
  where class_id=p_class and user_id=student_id;
  if not found then
   insert into playground_private.members(class_id,user_id,display_name,status,teacher_assigned)
   values(p_class,student_id,canonical_name,'pending',true);
   state:='assigned';
  elsif member.status='approved' then
   state:='already_enrolled';
  elsif member.status='removed' then
   -- Never silently undo a student's opt-out or a teacher removal.
   state:='removed';
  elsif member.teacher_assigned then
   state:='already_assigned';
  else
   -- Student had already requested this section and consented when joining.
   update playground_private.members set status='approved'
   where class_id=p_class and user_id=student_id;
   state:='approved';
  end if;
  results:=results||jsonb_build_array(jsonb_build_object(
   'username',canonical_name,'status',state
  ));
 end loop;
 return results;
end $$;

create function public.playground_accept_class(p_class uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update playground_private.members set status='approved'
 where class_id=p_class and user_id=auth.uid()
   and status='pending' and teacher_assigned=true;
 if not found then raise exception 'No pending teacher assignment found' using errcode='42501'; end if;
end $$;

-- Keep the existing approval and removal actions, but prohibit bypassing consent
-- for new teacher-assigned members.
create or replace function public.playground_set_member(p_class uuid,p_student uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform playground_private.require_teacher(p_class);
 if p_status not in ('approved','removed') then raise exception 'Invalid membership status'; end if;
 if p_status='approved' and exists (
  select 1 from playground_private.members m
  where m.class_id=p_class and m.user_id=p_student
  and m.status='pending' and m.teacher_assigned=true
 ) then
  raise exception 'Student must accept the class assignment first' using errcode='42501';
 end if;
 update playground_private.members set status=p_status
 where class_id=p_class and user_id=p_student;
 if not found then raise exception 'Student not found'; end if;
end $$;

revoke all on function public.playground_teacher_assign_students(uuid,text[]),
 public.playground_accept_class(uuid) from public,anon,authenticated;
grant execute on function public.playground_teacher_assign_students(uuid,text[]),
 public.playground_accept_class(uuid) to authenticated;

commit;
