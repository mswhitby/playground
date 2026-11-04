reset role;
update public.playground_grades set status='unavailable';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
insert into public.playground_submissions(id,course_id,activity_id,activity_kind,files) values('30000000-0000-0000-0000-000000000001','computer-science-1','challenge:app-event-type-tally','challenge','{"main.py":"def solution(): pass"}');
do $$ begin
 if (select count(*) from public.playground_grades where submission_id='30000000-0000-0000-0000-000000000001')<>1 then raise exception 'Own queued grade missing';end if;
 begin update public.playground_grades set points=10;raise exception 'Student wrote score';exception when insufficient_privilege then null;end;
 begin perform public.playground_claim_grades(1);raise exception 'Student claimed queue';exception when insufficient_privilege then null;end;
 begin perform public.playground_finish_grade('30000000-0000-0000-0000-000000000001',gen_random_uuid(),'graded',10,10,10,'grader_tests','test');raise exception 'Student finished grade';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
 if exists(select 1 from public.playground_grades where submission_id='30000000-0000-0000-0000-000000000001') then raise exception 'Other student read grade';end if;
end $$;
reset role;
set role service_role;
do $$ declare jobs jsonb;token uuid;begin
 -- Drain only this fixture's newly queued snapshot (other fixtures use other courses).
 jobs=public.playground_claim_grades(5);
 select lease into token from public.playground_grades where submission_id='30000000-0000-0000-0000-000000000001';
 if token is null then raise exception 'Worker did not lease grade';end if;
 if public.playground_finish_grade('30000000-0000-0000-0000-000000000001',gen_random_uuid(),'graded',10,10,10,'grader_tests','test') then raise exception 'Wrong lease accepted';end if;
 if not public.playground_finish_grade('30000000-0000-0000-0000-000000000001',token,'graded',10,7,10,'grader_tests','test') then raise exception 'Valid grade rejected';end if;
 if (select points from public.playground_grades where submission_id='30000000-0000-0000-0000-000000000001')<>7 then raise exception 'Partial credit incorrect';end if;
 if public.playground_finish_grade('30000000-0000-0000-0000-000000000001',token,'graded',10,10,10,'grader_tests','test') then raise exception 'Completed grade overwritten';end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform public.playground_claim_grades(1);raise exception 'Guest claimed queue';exception when insufficient_privilege then null;end;
 begin perform 1 from public.playground_grades;raise exception 'Guest read scores';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: server scores, partial credit, ownership, worker-only writes and immutable leases' as result;
