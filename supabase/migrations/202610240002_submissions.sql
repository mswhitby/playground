-- Run once in the existing Playground Supabase project.
-- Adds explicit hand-ins. Existing drafts and practice checks are unchanged.
begin;
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
commit;
