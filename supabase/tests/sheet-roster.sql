-- Sheet reconciliation remains scoped to the teacher and does not alter enrollment.
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select set_config('test.sheet_member_count',(select count(*) from playground_private.members)::text,false);
do $$ declare result jsonb;begin
 result:=public.playground_teacher_sync_sheet(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","first_name":"Ada","last_name":"Lovelace","periods":["1","3"]}]'::jsonb);
 if (result->>'new')::integer<>1 then raise exception 'Initial sheet import did not insert';end if;
end $$;
do $$ declare name_row jsonb;begin
 select e into name_row from jsonb_array_elements(public.playground_teacher_sheet_roster()) e
 where e->>'user_id'='00000000-0000-0000-0000-000000000002';
 if name_row->>'name'<>'Ada Lovelace' or name_row->'periods'<>'["1","3"]'::jsonb
 then raise exception 'Two periods or Sheet name were not stored';end if;
end $$;
do $$ declare result jsonb;begin
 result:=public.playground_teacher_sync_sheet(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","first_name":"Ada","last_name":"Lovelace","periods":["1","3"]}]'::jsonb);
 if (result->>'unchanged')::integer<>1 then raise exception 'Repeat import incorrectly changed record';end if;
 result:=public.playground_teacher_sync_sheet(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","first_name":"Grace","last_name":"Lovelace","periods":["1","4"]}]'::jsonb);
 if (result->>'updated')::integer<>1 then raise exception 'Re-import failed to update record';end if;
 if (select count(*) from playground_private.members)::text <> current_setting('test.sheet_member_count')
 then raise exception 'Re-import altered class enrollment';end if;
end $$;
-- A student may edit their own fallback name, without modifying their teacher's Sheet.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.playground_update_my_display_name('Student Preferred') as changed;
do $$ begin
 begin perform public.playground_teacher_sheet_roster();raise exception 'Student could read matched school names';
 exception when insufficient_privilege then null;end;
 begin perform public.playground_teacher_sync_sheet(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","first_name":"Tamper","last_name":"Attempt","periods":[]}]'::jsonb);
 raise exception 'Student could write school names';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 if jsonb_array_length(public.playground_teacher_sheet_roster())<>0
 then raise exception 'Sheet roster leaked across teacher groups';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ declare student jsonb;begin
 select e into student from jsonb_array_elements(public.playground_teacher_directory()) e
 where e->>'user_id'='00000000-0000-0000-0000-000000000002';
 if student->>'student_name'<>'Student Preferred' then raise exception 'Student-entered name not shown as fallback';end if;
 if (select r.first_name from playground_private.teacher_sheet_students r
  where r.user_id='00000000-0000-0000-0000-000000000002' and r.teacher_group=playground_private.teacher_group())<>'Grace'
 then raise exception 'Student edited a teacher Sheet name';end if;
end $$;
set role anon;
do $$ begin
 begin perform public.playground_teacher_sheet_roster();raise exception 'Anon read Sheet roster';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: two Sheet periods, repeat import changes, name fallback, enrollment preservation and isolation' as result;
