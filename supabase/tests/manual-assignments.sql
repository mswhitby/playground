-- Teacher can immediately enroll signed-in GitHub accounts by username.
reset role;
update auth.identities set identity_data='{"user_name":"LearnerB"}'::jsonb where provider_id='student-b';
update auth.identities set identity_data='{"user_name":"LearnerA"}'::jsonb where provider_id='student-a';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_create_class('Manual assignments','computer-science-1');
select set_config('test.manual_class',(public.playground_teacher_classes()->1->>'id'),false);
do $$ declare outcomes jsonb;begin
 outcomes:=public.playground_teacher_assign_students(current_setting('test.manual_class')::uuid,
 array['LearnerB','learnerb','@LearnerA','invalid.name','FutureAccount']);
 if jsonb_array_length(outcomes)<>4 then raise exception 'Duplicate usernames not ignored';end if;
 if outcomes->0->>'status'<>'enrolled' then raise exception 'Existing GitHub account not immediately enrolled';end if;
 if outcomes->1->>'status'<>'enrolled' then raise exception 'Second existing GitHub account not enrolled';end if;
 if outcomes->2->>'status'<>'invalid' then raise exception 'Invalid username accepted';end if;
 if outcomes->3->>'status'<>'queued' then raise exception 'New username not queued';end if;
 if jsonb_array_length(public.playground_teacher_queued_assignments(current_setting('test.manual_class')::uuid))<>1 then
  raise exception 'Queued assignment not visible to teacher';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$ begin
 if not exists (select 1 from jsonb_array_elements(public.playground_classroom_context()->'memberships') m
  where m->>'class_id'=current_setting('test.manual_class') and m->>'status'='approved')
  then raise exception 'Teacher enrollment still requires student approval';end if;
 begin perform public.playground_teacher_assign_students(current_setting('test.manual_class')::uuid,array['Someone']);
 raise exception 'Student changed class roster';
 exception when insufficient_privilege then null;end;
end $$;
-- Teacher removals cannot be undone by reassigning the same username.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_set_member(current_setting('test.manual_class')::uuid,'00000000-0000-0000-0000-000000000004','removed');
do $$ declare result jsonb;begin
 result:=public.playground_teacher_assign_students(current_setting('test.manual_class')::uuid,array['LearnerB']);
 if result->0->>'status'<>'removed' then raise exception 'Removed member was silently restored';end if;
end $$;
-- New GitHub user receives a queued assignment on their first Playground sign-in.
reset role;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000006');
insert into auth.identities(user_id,provider,provider_id,identity_data)
values('00000000-0000-0000-0000-000000000006','github','fresh-id','{"user_name":"FutureAccount"}');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000006';
do $$ begin
 if not exists (select 1 from jsonb_array_elements(public.playground_classroom_context()->'memberships') m
 where m->>'class_id'=current_setting('test.manual_class') and m->>'status'='approved') then
 raise exception 'Queued username was not enrolled on first login';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ begin
 if jsonb_array_length(public.playground_teacher_queued_assignments(current_setting('test.manual_class')::uuid))<>0
 then raise exception 'Resolved assignment still queued';end if;
end $$;
-- Teacher can cancel an unresolved username without enrolling anyone.
select public.playground_teacher_assign_students(current_setting('test.manual_class')::uuid,array['AbsentPerson']);
select public.playground_teacher_cancel_assignment(current_setting('test.manual_class')::uuid,'AbsentPerson');
do $$ begin
 if jsonb_array_length(public.playground_teacher_queued_assignments(current_setting('test.manual_class')::uuid))<>0
 then raise exception 'Cancelled assignment remained queued';end if;
end $$;
set role anon;
do $$ begin
 begin perform public.playground_teacher_queued_assignments(current_setting('test.manual_class')::uuid);
 raise exception 'Anonymous caller read pending assignments';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: immediate teacher enrollment, queued first-login matching, removals, and isolation' as result;
