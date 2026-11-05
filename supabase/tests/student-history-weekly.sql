-- Complete student history must exceed the classroom's 200-hand-in snapshot cap,
-- while weekly points count only score gains, never repeated or ungraded work.
reset role;
insert into public.playground_submissions
  (user_id,course_id,activity_id,activity_kind,files,submitted_at)
 select '00000000-0000-0000-0000-000000000006'::uuid,
 'computer-science-1','lesson:history-'||n,'lesson','{"main.py":"SECRET_SOURCE"}'::jsonb,
 '2026-11-02T10:00:00Z'::timestamptz
 from generate_series(1,205) n;
insert into public.playground_submissions(id,user_id,course_id,activity_id,activity_kind,files,submitted_at)
values
 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','computer-science-1','challenge:repeat','challenge','{"main.py":"DO_NOT_EXPOSE"}','2026-10-28T12:00:00Z'),
 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','computer-science-1','challenge:repeat','challenge','{"main.py":"DO_NOT_EXPOSE"}','2026-11-03T12:00:00Z'),
 ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','computer-science-1','challenge:repeat','challenge','{"main.py":"DO_NOT_EXPOSE"}','2026-11-04T12:00:00Z'),
 ('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000006','computer-science-1','challenge:another','challenge','{"main.py":"DO_NOT_EXPOSE"}','2026-11-04T13:00:00Z');
update public.playground_grades g set
 status='graded',possible=10,scope='grader_tests',passed_cases=v.pts,
 total_cases=10,points=v.pts,graded_at=now()
 from(values
 ('40000000-0000-0000-0000-000000000001'::uuid,5),
 ('40000000-0000-0000-0000-000000000002'::uuid,7),
 ('40000000-0000-0000-0000-000000000003'::uuid,3),
 ('40000000-0000-0000-0000-000000000004'::uuid,4)
 ) as v(id,pts) where g.submission_id=v.id;
insert into public.playground_progress(user_id,course_id,activity_id,activity_kind,status)
 values('00000000-0000-0000-0000-000000000006','computer-science-1','lesson:history-1','lesson','completed');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ declare history jsonb; score jsonb;begin
 history:=public.playground_teacher_student_history(current_setting('test.manual_class')::uuid,'00000000-0000-0000-0000-000000000006'::uuid);
 if jsonb_array_length(history->'submissions')<>209 then raise exception 'Complete assignment history did not include all submissions';end if;
 if history::text like '%SECRET_SOURCE%' or history::text like '%DO_NOT_EXPOSE%' then
  raise exception 'Source code leaked into bulk history';end if;
 if not exists(select 1 from jsonb_array_elements(history->'practice') p
   where p->>'activity_id'='lesson:history-1' and p->>'status'='completed') then
  raise exception 'Completed practice missing from history';end if;
 if (select jsonb_array_length(public.playground_teacher_snapshot(current_setting('test.manual_class')::uuid)->'submissions'))>200 then
  raise exception 'Snapshot limit unexpectedly exceeded';end if;
 score:=public.playground_teacher_weekly_points(current_setting('test.manual_class')::uuid);
 if not exists(select 1 from jsonb_array_elements(score->'weeks') w
  where w->>'user_id'='00000000-0000-0000-0000-000000000006'
    and w->>'week_start'='2026-10-26' and (w->>'points')::numeric=5) then
  raise exception 'Week one points must equal first best grade';end if;
 if not exists(select 1 from jsonb_array_elements(score->'weeks') w
  where w->>'user_id'='00000000-0000-0000-0000-000000000006'
    and w->>'week_start'='2026-11-02' and (w->>'points')::numeric=6) then
  raise exception 'Week two must award only +2 improvement and 4 other points';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin
 begin perform public.playground_teacher_student_history(current_setting('test.manual_class')::uuid,'00000000-0000-0000-0000-000000000006');
 raise exception 'Student read peer history';exception when insufficient_privilege then null;end;
 begin perform public.playground_teacher_weekly_points(current_setting('test.manual_class')::uuid);
 raise exception 'Student read weekly leaderboard';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 begin perform public.playground_teacher_weekly_points(current_setting('test.manual_class')::uuid);
 raise exception 'Other teacher group read weekly points';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ begin
 begin perform public.playground_teacher_student_history(current_setting('test.manual_class')::uuid,'00000000-0000-0000-0000-000000000004');
 raise exception 'Inactive user history visible';exception when insufficient_privilege then null;end;
end $$;
set role anon;
do $$ begin
 begin perform public.playground_teacher_weekly_points(current_setting('test.manual_class')::uuid);
 raise exception 'Anonymous weekly points access';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: full history, no source disclosure, weekly improvement scoring, and teacher-only access' as result;
