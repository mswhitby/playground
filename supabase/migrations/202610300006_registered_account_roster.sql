-- Account directory and class organizer for the shared Playground.
-- Independent of the optional 202610300005 username-assignment migration.
-- Requires the existing classroom setup and auto-join migration.
begin;
create table if not exists playground_private.account_kinds (
 user_id uuid primary key references auth.users(id) on delete cascade,
 kind text not null check(kind in ('student','client')),
 updated_at timestamptz not null default now()
);
alter table playground_private.account_kinds enable row level security;
revoke all on playground_private.account_kinds from public,anon,authenticated;

create or replace function playground_private.require_managed_user(p_student uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
 perform playground_private.require_teacher();
 if p_student is null or not exists(
  select 1 from auth.users u join auth.identities i
  on i.user_id=u.id and i.provider='github' where u.id=p_student
 ) then raise exception 'Registered GitHub account not found' using errcode='22023';end if;
 if exists(
  select 1 from auth.identities i
  join playground_private.teacher_accounts t
  on i.provider='github' and i.provider_id=t.provider_id
  where i.user_id=p_student
 ) then raise exception 'Teacher accounts cannot be managed as students' using errcode='42501';end if;
end $$;

-- Account directory lists users who actually authenticated through GitHub.
-- It does not require a join request, class code, or a Sheets import.
create function public.playground_teacher_directory()
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

-- Categorizing as a private client revokes existing class memberships.
-- Reclassifying as student does not silently restore previous access.
create function public.playground_teacher_set_account_kind(p_student uuid,p_kind text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform playground_private.require_managed_user(p_student);
 if p_kind is null or p_kind not in ('student','client') then
  raise exception 'Invalid account type' using errcode='22023';end if;
 insert into playground_private.account_kinds(user_id,kind)
 values(p_student,p_kind)
 on conflict(user_id) do update set kind=excluded.kind,updated_at=now();
 if p_kind='client' then
  update playground_private.members m set status='removed'
  from playground_private.classes c
  where c.id=m.class_id and c.teacher_group=playground_private.teacher_group()
   and m.user_id=p_student and m.status<>'removed';
 end if;
end $$;

-- Guard all membership entry paths, including joining by code or older
-- teacher-assignment endpoints. A client must be reclassified first.
create function playground_private.prevent_client_enrollment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('pending','approved') and exists(
   select 1 from playground_private.account_kinds k
   where k.user_id=new.user_id and k.kind='client'
 ) then raise exception 'Private client accounts cannot join class sections' using errcode='42501';end if;
 return new;
end $$;
drop trigger if exists playground_client_membership_guard on playground_private.members;
create trigger playground_client_membership_guard
before insert or update of status on playground_private.members
for each row execute function playground_private.prevent_client_enrollment();

-- Class changes affect only membership, not existing attempts, drafts or
-- submissions. Moving is within one course; use Add for another course.
create function public.playground_teacher_manage_membership(
 p_student uuid,p_action text,p_to_class uuid default null,p_from_class uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare
 student_name text;
 source_course text;
 target_course text;
begin
 perform playground_private.require_managed_user(p_student);
 if p_action not in ('add','move','remove') then raise exception 'Invalid class action' using errcode='22023';end if;
 if p_action in ('add','move') then
  if p_to_class is null then raise exception 'Destination class is required';end if;
  perform playground_private.require_teacher(p_to_class);
  if exists(select 1 from playground_private.account_kinds k
    where k.user_id=p_student and k.kind='client') then
   raise exception 'Reclassify private clients as students before assigning' using errcode='42501';end if;
 end if;
 if p_action in ('remove','move') then
  if p_from_class is null then raise exception 'Source class is required';end if;
  perform playground_private.require_teacher(p_from_class);
  if not exists(select 1 from playground_private.members m
   where m.class_id=p_from_class and m.user_id=p_student and m.status in ('approved','pending'))
   then raise exception 'Student is not in source class' using errcode='22023';end if;
 end if;
 if p_action='add' and p_from_class is not null then raise exception 'Add does not accept source class';end if;
 if p_action='remove' and p_to_class is not null then raise exception 'Remove does not accept destination class';end if;
 if p_action='move' then
  if p_from_class=p_to_class then raise exception 'Choose a different section' using errcode='22023';end if;
  select c.course_id into source_course from playground_private.classes c where c.id=p_from_class;
  select c.course_id into target_course from playground_private.classes c where c.id=p_to_class;
  if source_course<>target_course then
   raise exception 'Move within a course only; use Add for another course' using errcode='22023';end if;
 end if;
 if p_action in ('remove','move') then
  update playground_private.members m set status='removed'
  where m.class_id=p_from_class and m.user_id=p_student;
 end if;
 if p_action in ('add','move') then
  select coalesce(nullif(i.identity_data->>'user_name',''),
   nullif(i.identity_data->>'preferred_username',''),'GitHub student')
  into student_name from auth.identities i
  where i.user_id=p_student and i.provider='github' limit 1;
  insert into playground_private.members(class_id,user_id,display_name,status)
  values(p_to_class,p_student,student_name,'approved')
  on conflict(class_id,user_id) do update
    set status='approved',display_name=excluded.display_name;
 end if;
end $$;

create function public.playground_teacher_bulk_add(p_students uuid[],p_class uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare student uuid; added integer:=0;
begin
 perform playground_private.require_teacher(p_class);
 if p_students is null or cardinality(p_students) not between 1 and 200 then
  raise exception 'Select between 1 and 200 accounts' using errcode='22023';end if;
 for student in select distinct unnest(p_students) loop
  perform public.playground_teacher_manage_membership(student,'add',p_class,null);
  added:=added+1;
 end loop;
 return added;
end $$;

revoke all on function playground_private.require_managed_user(uuid),
 playground_private.prevent_client_enrollment() from public,anon,authenticated;
revoke all on function public.playground_teacher_directory(),
 public.playground_teacher_set_account_kind(uuid,text),
 public.playground_teacher_manage_membership(uuid,text,uuid,uuid),
 public.playground_teacher_bulk_add(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.playground_teacher_directory(),
 public.playground_teacher_set_account_kind(uuid,text),
 public.playground_teacher_manage_membership(uuid,text,uuid,uuid),
 public.playground_teacher_bulk_add(uuid[],uuid) to authenticated;
commit;
