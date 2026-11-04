-- Matched Google Sheet roster fields live in a private teacher-scoped table.
-- Never stores Sheet URLs, access tokens, emails, student IDs, or unregistered rows.
begin;

create table if not exists playground_private.teacher_sheet_students (
  teacher_group text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  class_periods text[] not null default '{}'::text[],
  synced_at timestamptz not null default now(),
  synced_by uuid not null references auth.users(id),
  primary key(teacher_group,user_id),
  constraint sheet_period_limit check(cardinality(class_periods) <= 2)
);
alter table playground_private.teacher_sheet_students enable row level security;
revoke all on playground_private.teacher_sheet_students from public,anon,authenticated;

create function public.playground_teacher_sheet_roster()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform playground_private.require_teacher();
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'user_id',r.user_id,'first_name',r.first_name,'last_name',r.last_name,
   'name',nullif(btrim(concat_ws(' ',nullif(r.first_name,''),nullif(r.last_name,''))),''),
   'periods',r.class_periods,'synced_at',r.synced_at
  ) order by r.user_id)
  from playground_private.teacher_sheet_students r
  where r.teacher_group=playground_private.teacher_group()
 ),'[]'::jsonb);
end $$;

-- Explicit Google Sheet loading triggers sync of matched verified GitHub users.
-- Missing rows are retained for review, NOT deleted. No memberships are changed.
create function public.playground_teacher_sync_sheet(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 item jsonb;
 student uuid;
 first text;
 last text;
 periods text[];
 old_first text;
 old_last text;
 old_periods text[];
 seen uuid[]:='{}'::uuid[];
 added integer:=0;
 updated integer:=0;
 unchanged integer:=0;
 changes jsonb:='[]'::jsonb;
 teacher text;
begin
 perform playground_private.require_teacher();
 teacher:=playground_private.teacher_group();
 if p_rows is null or jsonb_typeof(p_rows)<>'array'
  or jsonb_array_length(p_rows) not between 1 and 200 then
  raise exception 'Provide between 1 and 200 matched Sheet students' using errcode='22023';
 end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(item)<>'object'
    or jsonb_typeof(item->'user_id')<>'string'
    or jsonb_typeof(item->'periods')<>'array'
    or jsonb_typeof(item->'first_name')<>'string'
    or jsonb_typeof(item->'last_name')<>'string' then
    raise exception 'Each Sheet match must contain account, first name, last name and periods' using errcode='22023';
  end if;
  student:=(item->>'user_id')::uuid;
  if student=any(seen) then raise exception 'Duplicate student in sync batch' using errcode='22023';end if;
  seen:=array_append(seen,student);
  perform playground_private.require_managed_user(student);
  first:=btrim(item->>'first_name');
  last:=btrim(item->>'last_name');
  if char_length(first)>80 or char_length(last)>80
    or first ~ '[[:cntrl:]]' or last ~ '[[:cntrl:]]' then
    raise exception 'Invalid Sheet student name' using errcode='22023';
  end if;
  if jsonb_array_length(item->'periods')>2 or exists(
    select 1 from jsonb_array_elements(item->'periods') v
    where jsonb_typeof(v.value)<>'string'
       or char_length(btrim(v.value #>> '{}')) not between 1 and 40
       or (v.value #>> '{}') ~ '[[:cntrl:]]'
  ) then raise exception 'Expected up to two valid class periods' using errcode='22023';end if;
  select coalesce(array_agg(p.period order by p.first_position),'{}'::text[])
   into periods from (
    select btrim(v.value) as period,min(v.ordinality) as first_position
    from jsonb_array_elements_text(item->'periods') with ordinality as v(value,ordinality)
    group by btrim(v.value)
   ) p;
  select s.first_name,s.last_name,s.class_periods
   into old_first,old_last,old_periods
   from playground_private.teacher_sheet_students s
   where s.teacher_group=teacher and s.user_id=student for update;
  if not found then
    insert into playground_private.teacher_sheet_students
      (teacher_group,user_id,first_name,last_name,class_periods,synced_by)
    values(teacher,student,first,last,periods,auth.uid());
    added:=added+1;
    changes:=changes||jsonb_build_array(jsonb_build_object('user_id',student,'change','new'));
  elsif old_first is distinct from first or old_last is distinct from last
     or old_periods is distinct from periods then
    update playground_private.teacher_sheet_students s
     set first_name=first,last_name=last,class_periods=periods,synced_by=auth.uid(),synced_at=now()
     where s.teacher_group=teacher and s.user_id=student;
    updated:=updated+1;
    changes:=changes||jsonb_build_array(jsonb_build_object(
      'user_id',student,'change','updated',
      'name_changed',(old_first,old_last) is distinct from (first,last),
      'periods_changed',old_periods is distinct from periods));
  else
    unchanged:=unchanged+1;
  end if;
 end loop;
 return jsonb_build_object('new',added,'updated',updated,'unchanged',unchanged,'changes',changes);
end $$;

-- Expose the name supplied on the site to the teacher, without writing it over
-- the independently verified Sheet fields. This is a teacher-only RPC.
create or replace function public.playground_teacher_directory()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform playground_private.require_teacher();
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'user_id',u.id,
   'github_account',coalesce(nullif(i.identity_data->>'user_name',''),
      nullif(i.identity_data->>'preferred_username',''),'GitHub account'),
   'display_name',coalesce(nullif(i.identity_data->>'user_name',''),
      nullif(i.identity_data->>'preferred_username',''),'GitHub account'),
   'student_name',(
     select nullif(btrim(m.display_name),'')
     from playground_private.members m
     join playground_private.classes c on c.id=m.class_id
     where m.user_id=u.id and c.teacher_group=playground_private.teacher_group()
       and m.status in ('approved','pending')
     order by (
       lower(btrim(m.display_name))=lower(coalesce(
        nullif(i.identity_data->>'user_name',''),
        nullif(i.identity_data->>'preferred_username',''),''))) asc,
       m.joined_at desc
     limit 1
   ),
   'kind',coalesce(k.kind,'student'),
   'memberships',coalesce((
    select jsonb_agg(jsonb_build_object(
      'class_id',c.id,'name',c.name,'course_id',c.course_id,'status',m.status)
      order by c.name)
    from playground_private.members m join playground_private.classes c
      on c.id=m.class_id
    where m.user_id=u.id and c.teacher_group=playground_private.teacher_group()
      and m.status in ('approved','pending')
   ),'[]'::jsonb)
  ) order by lower(coalesce(nullif(i.identity_data->>'user_name',''),
     nullif(i.identity_data->>'preferred_username',''),'~')),u.id)
  from auth.users u
  join lateral (
   select x.identity_data from auth.identities x
   where x.user_id=u.id and x.provider='github'
   order by x.provider_id limit 1
  ) i on true
  left join playground_private.account_kinds k on k.user_id=u.id
  where not exists (
   select 1 from auth.identities ti
   join playground_private.teacher_accounts t
    on t.provider_id=ti.provider_id and ti.provider='github'
   where ti.user_id=u.id
  )
 ),'[]'::jsonb);
end $$;

-- Students can supply or correct their own backup display name without a Sheet.
-- This never changes teacher Sheet data or membership statuses.
create function public.playground_update_my_display_name(p_name text)
returns integer language plpgsql security definer set search_path='' as $body$
declare modified integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80
   or p_name ~ '[[:cntrl:]]' then
   raise exception 'Enter a name of 1 to 80 characters' using errcode='22023';
 end if;
 update playground_private.members set display_name=btrim(p_name)
 where user_id=auth.uid() and status in ('approved','pending');
 get diagnostics modified=row_count;
 return modified;
end $body$;

revoke all on function public.playground_teacher_sheet_roster(),
 public.playground_teacher_sync_sheet(jsonb),
 public.playground_update_my_display_name(text) from public,anon,authenticated;
grant execute on function public.playground_teacher_sheet_roster(),
 public.playground_teacher_sync_sheet(jsonb),
 public.playground_update_my_display_name(text) to authenticated;
commit;
