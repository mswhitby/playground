-- Playground: private student practice progress and saved drafts.
-- Run once in the Supabase SQL Editor for project lndzhmwvooqfrqcafhut.
-- This creates new tables only. If a name already exists, the transaction fails
-- rather than modifying an existing table. No existing records are deleted.
-- Browser-reported practice results are not trusted assessment grades.

begin;

create table public.playground_progress (
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    course_id text not null check (course_id in ('computer-science-1', 'game-programming', 'mobile-app-dev', 'uil', 'capstone')),
    activity_id text not null check (char_length(activity_id) between 1 and 200),
    content_version text not null default '1' check (char_length(content_version) between 1 and 128),
    activity_kind text not null check (activity_kind in ('lesson', 'challenge', 'quiz', 'project', 'programming', 'self-report')),
    status text not null check (status in ('started', 'completed', 'needs_revision')),
    practice_data jsonb not null default '{}'::jsonb check (jsonb_typeof(practice_data) = 'object' and octet_length(practice_data::text) <= 16384),
    verification text not null default 'browser_practice' check (verification = 'browser_practice'),
    updated_at timestamptz not null default now(),
    primary key (user_id, course_id, activity_id, content_version)
);

create table public.playground_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    course_id text not null check (course_id in ('computer-science-1', 'game-programming', 'mobile-app-dev', 'uil', 'capstone')),
    activity_id text not null check (char_length(activity_id) between 1 and 200),
    content_version text not null default '1' check (char_length(content_version) between 1 and 128),
    activity_kind text not null check (activity_kind in ('lesson', 'challenge', 'quiz', 'project', 'programming', 'self-report')),
    practice_data jsonb not null default '{}'::jsonb check (jsonb_typeof(practice_data) = 'object' and octet_length(practice_data::text) <= 16384),
    verification text not null default 'browser_practice' check (verification = 'browser_practice'),
    recorded_at timestamptz not null default now()
);
create index playground_attempts_user_activity
    on public.playground_attempts (user_id, course_id, activity_id, recorded_at desc);

create table public.playground_drafts (
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    course_id text not null check (course_id in ('computer-science-1', 'game-programming', 'mobile-app-dev', 'uil', 'capstone')),
    activity_id text not null check (char_length(activity_id) between 1 and 200),
    file_name text not null default 'main' check (char_length(file_name) between 1 and 200),
    source_code text not null default '' check (octet_length(source_code) <= 262144),
    revision bigint not null default 1 check (revision > 0),
    updated_at timestamptz not null default now(),
    primary key (user_id, course_id, activity_id, file_name)
);

-- Always set modification times on the database, not from a browser clock.
create function public.playground_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    if tg_table_name = 'playground_drafts' then
        if tg_op = 'INSERT' then
            new.revision := 1;
        else
            new.revision := old.revision + 1;
        end if;
    end if;
    return new;
end;
$$;
revoke all on function public.playground_set_updated_at() from public, anon, authenticated;

create trigger playground_progress_timestamp
    before insert or update on public.playground_progress
    for each row execute function public.playground_set_updated_at();
create trigger playground_drafts_timestamp
    before insert or update on public.playground_drafts
    for each row execute function public.playground_set_updated_at();

alter table public.playground_progress enable row level security;
alter table public.playground_attempts enable row level security;
alter table public.playground_drafts enable row level security;

-- No anonymous reads, writes, or default access to the new tables.
revoke all on table public.playground_progress from public, anon, authenticated;
revoke all on table public.playground_attempts from public, anon, authenticated;
revoke all on table public.playground_drafts from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.playground_progress to authenticated;
grant insert (user_id, course_id, activity_id, content_version, activity_kind, status, practice_data)
    on public.playground_progress to authenticated;
grant update (user_id, course_id, activity_id, content_version, activity_kind, status, practice_data)
    on public.playground_progress to authenticated;

grant select on public.playground_attempts to authenticated;
grant insert (id, user_id, course_id, activity_id, content_version, activity_kind, practice_data)
    on public.playground_attempts to authenticated;
-- Attempts are append-only for students: no update or delete grant.

grant select on public.playground_drafts to authenticated;
grant insert (user_id, course_id, activity_id, file_name, source_code)
    on public.playground_drafts to authenticated;
grant update (user_id, course_id, activity_id, file_name, source_code) on public.playground_drafts to authenticated;

create policy playground_progress_read_own on public.playground_progress
    for select to authenticated using ((select auth.uid()) = user_id);
create policy playground_progress_insert_own on public.playground_progress
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy playground_progress_update_own on public.playground_progress
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy playground_attempts_read_own on public.playground_attempts
    for select to authenticated using ((select auth.uid()) = user_id);
create policy playground_attempts_insert_own on public.playground_attempts
    for insert to authenticated with check ((select auth.uid()) = user_id);

create policy playground_drafts_read_own on public.playground_drafts
    for select to authenticated using ((select auth.uid()) = user_id);
create policy playground_drafts_insert_own on public.playground_drafts
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy playground_drafts_update_own on public.playground_drafts
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

comment on table public.playground_progress is
    'Private per-account practice summaries. Browser reports are not official grades.';
comment on table public.playground_attempts is
    'Private, append-only browser practice attempts. No teacher access until explicitly configured.';
comment on table public.playground_drafts is
    'Private source drafts. Revision supports detecting concurrent edits across devices.';

commit;

-- A successful run returns three rows with row_security_enabled = true.
select tablename, rowsecurity as row_security_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('playground_progress', 'playground_attempts', 'playground_drafts')
order by tablename;
