-- Teacher-approved student display names, independent of GitHub handles or temporary Google Sheet tokens.
-- Run after 202610300006_registered_account_roster.sql.
-- No Google credentials, Sheet IDs, periods, or raw spreadsheets are saved.
begin;

create table if not exists playground_private.teacher_display_names (
  teacher_group text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (teacher_group,user_id)
);
alter table playground_private.teacher_display_names enable row level security;
revoke all on playground_private.teacher_display_names from public,anon,authenticated;

create function public.playground_teacher_names()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform playground_private.require_teacher();
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id',n.user_id,'display_name',n.display_name) order by n.display_name)
    from playground_private.teacher_display_names n
    where n.teacher_group=playground_private.teacher_group()
  ),'[]'::jsonb);
end $$;

-- Names are saved only following an explicit teacher action, either by editing
-- one account or confirming a match from the private browser-only Google Sheet.
-- Empty names remove teacher overrides and restore the GitHub display fallback.
create function public.playground_teacher_save_names(p_rows jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb;
  student_id uuid;
  full_name text;
  changed integer:=0;
  group_id text;
begin
  perform playground_private.require_teacher();
  group_id:=playground_private.teacher_group();
  if p_rows is null or jsonb_typeof(p_rows)<>'array'
    or jsonb_array_length(p_rows) not between 1 and 200 then
    raise exception 'Provide between 1 and 200 student names' using errcode='22023';
  end if;

  for row_data in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(row_data)<>'object' or
      coalesce(row_data->>'user_id','')='' or
      jsonb_typeof(row_data->'display_name')<>'string' then
      raise exception 'Each row needs a registered account and a name' using errcode='22023';
    end if;
    student_id:=(row_data->>'user_id')::uuid;
    full_name:=trim(row_data->>'display_name');
    perform playground_private.require_managed_user(student_id);
    if char_length(full_name)>80 or full_name ~ '[[:cntrl:]]' then
      raise exception 'Student name must be 80 characters or fewer without control characters' using errcode='22023';
    end if;
    if full_name='' then
      delete from playground_private.teacher_display_names n
      where n.teacher_group=group_id and n.user_id=student_id;
    else
      insert into playground_private.teacher_display_names
        (teacher_group,user_id,display_name,updated_by)
      values (group_id,student_id,full_name,auth.uid())
      on conflict (teacher_group,user_id) do update
        set display_name=excluded.display_name,
            updated_by=excluded.updated_by,updated_at=now();
    end if;
    changed:=changed+1;
  end loop;
  return changed;
end $$;

revoke all on function public.playground_teacher_names(),
  public.playground_teacher_save_names(jsonb) from public,anon,authenticated;
grant execute on function public.playground_teacher_names(),
  public.playground_teacher_save_names(jsonb) to authenticated;
commit;
