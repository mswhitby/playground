-- TSI enrollment foundation. Does not create or modify auth identities.
-- Existing coding-course auto-enrollment and historical scores are unchanged.
begin;

alter table playground_private.classes
  drop constraint if exists classes_course_id_check;
alter table playground_private.classes
  add constraint classes_course_id_check
  check (course_id in (
    'computer-science-1','game-programming','mobile-app-dev',
    'uil','capstone','tsi-math'
  ));

-- TSI enrollment requires explicit approval. Coding-course GitHub join
-- behavior remains exactly as before. A removed membership stays removed.
create or replace function public.playground_join_class(p_code text,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  c playground_private.classes;
  member playground_private.members;
  account_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  select * into c from playground_private.classes
    where join_code=upper(trim(p_code));
  if not found then raise exception 'Class code not found'; end if;

  if c.course_id='tsi-math' then
    if char_length(trim(coalesce(p_name,''))) not between 1 and 80 then
      raise exception 'Display name must contain 1 to 80 characters'
        using errcode='22023';
    end if;
    insert into playground_private.members(class_id,user_id,display_name,status)
      values(c.id,auth.uid(),trim(p_name),'pending')
    on conflict(class_id,user_id) do update
      set display_name=excluded.display_name
    returning * into member;
  else
    select coalesce(nullif(identity_data->>'user_name',''),
      nullif(identity_data->>'preferred_username',''),'GitHub student')
      into account_name from auth.identities
      where user_id=auth.uid() and provider='github' limit 1;
    if not found then
      raise exception 'GitHub sign-in required' using errcode='42501';
    end if;
    insert into playground_private.members(class_id,user_id,display_name,status)
      values(c.id,auth.uid(),account_name,'approved')
    on conflict(class_id,user_id) do update
      set display_name=excluded.display_name,
          status=case when playground_private.members.status='removed'
            then 'removed' else 'approved' end
    returning * into member;
  end if;
  return jsonb_build_object('name',c.name,'status',member.status);
end $$;

-- One teacher action can approve or reject a selected TSI cohort.
-- Refuses non-TSI classes and non-pending students; all-or-nothing.
create function public.playground_teacher_bulk_tsi_enrollment(
  p_class uuid,p_students uuid[],p_action text
) returns integer language plpgsql security definer set search_path='' as $$
declare expected_count integer; changed_count integer;
begin
  perform playground_private.require_teacher(p_class);
  if not exists(select 1 from playground_private.classes
      where id=p_class and course_id='tsi-math') then
    raise exception 'TSI section required' using errcode='22023';
  end if;
  if p_action not in ('approve','reject') then
    raise exception 'Invalid action' using errcode='22023';
  end if;
  if p_students is null or cardinality(p_students) not between 1 and 200
      or array_position(p_students,null) is not null then
    raise exception 'Select 1 to 200 students' using errcode='22023';
  end if;
  select count(*) into expected_count from
    (select distinct unnest(p_students) as user_id) selected;
  select count(*) into changed_count
    from playground_private.members m
    where m.class_id=p_class and m.user_id=any(p_students)
      and m.status='pending';
  if changed_count<>expected_count then
    raise exception 'Selection includes students without pending enrollment'
      using errcode='22023';
  end if;
  update playground_private.members
    set status=case when p_action='approve' then 'approved' else 'removed' end
    where class_id=p_class and user_id=any(p_students) and status='pending';
  return expected_count;
end $$;

revoke all on function public.playground_teacher_bulk_tsi_enrollment(
  uuid,uuid[],text) from public,anon,authenticated;
grant execute on function public.playground_teacher_bulk_tsi_enrollment(
  uuid,uuid[],text) to authenticated;
commit;
