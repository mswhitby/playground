-- Apply after the existing Playground classroom/submission migrations.
begin;
create table public.playground_grades (
 submission_id uuid primary key references public.playground_submissions(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','running','graded','error','unavailable')),
 points numeric, possible numeric, scope text check(scope in ('grader_tests','published_tests','teacher')),
 passed_cases integer,total_cases integer,graded_at timestamptz,
 grader_version text,lease uuid,lease_until timestamptz,attempts integer not null default 0,
 check(status<>'graded' or (points is not null and possible>0 and points>=0 and points<=possible and scope is not null and graded_at is not null and total_cases>0 and passed_cases between 0 and total_cases))
);
create index playground_grade_queue on public.playground_grades(status,lease_until);
alter table public.playground_grades enable row level security;
revoke all on public.playground_grades from public,anon,authenticated;
grant select(submission_id,status,points,possible,scope,passed_cases,total_cases,graded_at) on public.playground_grades to authenticated;
grant all on public.playground_grades to service_role;
create policy grades_read_own on public.playground_grades for select to authenticated using(exists(select 1 from public.playground_submissions s where s.id=submission_id and s.user_id=(select auth.uid())));
create function playground_private.enqueue_grade() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.course_id='computer-science-1' and new.activity_kind in ('lesson','challenge') and new.activity_id not like 'review:%' then insert into public.playground_grades(submission_id) values(new.id) on conflict do nothing;end if;
 return new;
end $$;
revoke all on function playground_private.enqueue_grade() from public,anon,authenticated;
create trigger enqueue_playground_grade after insert on public.playground_submissions for each row execute function playground_private.enqueue_grade();
-- Backfill immutable hand-ins, not browser checks or drafts.
insert into public.playground_grades(submission_id) select id from public.playground_submissions where course_id='computer-science-1' and activity_kind in ('lesson','challenge') and activity_id not like 'review:%' on conflict do nothing;
create function public.playground_claim_grades(p_limit integer default 3) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with claimed as (
  update public.playground_grades g set status='running',lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',attempts=attempts+1
  where g.submission_id in (select q.submission_id from public.playground_grades q join public.playground_submissions s on s.id=q.submission_id where (q.status='queued' or (q.status='running' and q.lease_until<now())) and q.attempts<3 order by s.submitted_at for update of q skip locked limit least(greatest(p_limit,1),5))
  returning g.submission_id,g.lease
 ) select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'activity_id',s.activity_id,'files',s.files,'lease',c.lease)),'[]'::jsonb) into result from claimed c join public.playground_submissions s on s.id=c.submission_id;
 update public.playground_grades set status='error',lease=null,lease_until=null where status='running' and lease_until<now() and attempts>=3;
 return result;
end $$;
create function public.playground_finish_grade(p_id uuid,p_lease uuid,p_status text,p_possible numeric default null,p_passed integer default null,p_total integer default null,p_scope text default null,p_version text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if p_status not in ('graded','error','unavailable') then raise exception 'Invalid grading status';end if;
 if p_status='graded' and (p_possible is null or p_possible<=0 or p_total is null or p_total<=0 or p_passed is null or p_passed<0 or p_passed>p_total or p_scope is null or p_scope not in ('grader_tests','published_tests')) then raise exception 'Invalid grade';end if;
 update public.playground_grades set status=p_status,points=case when p_status='graded' then round(p_possible*p_passed/p_total,2) else null end,possible=case when p_status='graded' then p_possible else null end,passed_cases=p_passed,total_cases=p_total,scope=p_scope,graded_at=now(),grader_version=p_version,lease=null,lease_until=null where submission_id=p_id and lease=p_lease and status='running';
 get diagnostics changed=row_count;return changed=1;
end $$;
revoke all on function public.playground_claim_grades(integer),public.playground_finish_grade(uuid,uuid,text,numeric,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.playground_claim_grades(integer),public.playground_finish_grade(uuid,uuid,text,numeric,integer,integer,text,text) to service_role;
comment on table public.playground_grades is 'Server-graded immutable hand-ins. Students can read their own results and cannot write scores. Grader test data and execution remain outside the browser.';
commit;
