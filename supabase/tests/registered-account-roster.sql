reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_create_class('Another Computer Science I','computer-science-1');
select set_config('test.second_class',(public.playground_teacher_classes()->2->>'id'),false);
do $$ declare data jsonb;begin
 data:=public.playground_teacher_directory();
 if jsonb_array_length(data)<>3 then raise exception 'Directory did not list all non-teacher registered GitHub accounts';end if;
 if exists(select 1 from jsonb_array_elements(data) a where a->>'github_account'='LearnerB' and a->>'kind'<>'student')
 then raise exception 'Unexpected client classification';end if;
end $$;
-- In one place, add an already-registered user who never joined this section.
select public.playground_teacher_manage_membership('00000000-0000-0000-0000-000000000004',
 'add',current_setting('test.second_class')::uuid,null);
do $$ declare row jsonb;begin
 select m into row from jsonb_array_elements(public.playground_teacher_directory()) m
 where m->>'github_account'='LearnerB';
 if not exists(select 1 from jsonb_array_elements(row->'memberships') a
 where a->>'class_id'=current_setting('test.second_class') and a->>'status'='approved')
 then raise exception 'Direct directory enrollment did not work';end if;
end $$;
-- Add multiple students and move a member within the same course.
select public.playground_teacher_bulk_add(array[
 '00000000-0000-0000-0000-000000000002'::uuid,
 '00000000-0000-0000-0000-000000000004'::uuid],
 current_setting('test.manual_class')::uuid);
select public.playground_teacher_manage_membership('00000000-0000-0000-0000-000000000004',
 'move',current_setting('test.manual_class')::uuid,current_setting('test.second_class')::uuid);
do $$ declare row jsonb;begin
 select m into row from jsonb_array_elements(public.playground_teacher_directory()) m
 where m->>'github_account'='LearnerB';
 if exists(select 1 from jsonb_array_elements(row->'memberships') x where x->>'class_id'=current_setting('test.second_class')) then
 raise exception 'Move retained membership in source class';end if;
 if not exists(select 1 from jsonb_array_elements(row->'memberships') x where x->>'class_id'=current_setting('test.manual_class') and x->>'status'='approved') then
 raise exception 'Move did not activate destination';end if;
end $$;
-- A private client cannot be accidentally assigned a classroom.
select public.playground_teacher_set_account_kind('00000000-0000-0000-0000-000000000004','client');
do $$ begin
 if exists(select 1 from jsonb_array_elements(public.playground_teacher_directory()) p,
 jsonb_array_elements(p->'memberships') x where p->>'github_account'='LearnerB' and x->>'status'='approved') then raise exception 'Client still enrolled';end if;
 begin
  perform public.playground_teacher_manage_membership('00000000-0000-0000-0000-000000000004','add',current_setting('test.second_class')::uuid,null);
  raise exception 'Client joined section';
 exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$ begin
 if exists(select 1 from jsonb_array_elements(public.playground_classroom_context()->'memberships') x where x->>'status'='approved') then
 raise exception 'Client could view own class after classification';end if;
 begin perform public.playground_teacher_directory();raise exception 'Student read full account directory';
 exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_teacher_set_account_kind('00000000-0000-0000-0000-000000000004','student');
do $$ declare data jsonb;begin
 data:=public.playground_teacher_directory();
 if (select count(*) from jsonb_array_elements(data) a where a->>'github_account'='LearnerB' and a->>'kind'='student')<>1
 then raise exception 'Client classification not reversible';end if;
 if exists(select 1 from jsonb_array_elements(data) p,
 jsonb_array_elements(p->'memberships') m where p->>'github_account'='LearnerB' and m->>'status'='approved') then
 raise exception 'Reclassified client unexpectedly rejoined a class';end if;
end $$;
-- Teacher account must never be treated as student.
do $$ begin
 begin perform public.playground_teacher_manage_membership('00000000-0000-0000-0000-000000000003','add',current_setting('test.second_class')::uuid,null);
 raise exception 'Teacher account could be enrolled as a student';
 exception when insufficient_privilege then null;end;
end $$;
-- Cross-group and anonymous access remain blocked.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 begin perform public.playground_teacher_manage_membership('00000000-0000-0000-0000-000000000002','add',current_setting('test.second_class')::uuid,null);
 raise exception 'Other group assigned user';
 exception when insufficient_privilege then null;end;
end $$;
set role anon;
do $$ begin
 begin perform public.playground_teacher_directory();raise exception 'Anonymous account directory permitted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: teacher-only directory, existing-account enrollment, move, bulk add, client classification, and account isolation' as result;
