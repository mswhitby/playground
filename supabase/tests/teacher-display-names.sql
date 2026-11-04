-- Teacher-confirmed real names survive reloads while remaining teacher-scoped.
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_teacher_save_names(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","display_name":"Sample Student"}]'::jsonb);
do $$ declare d jsonb; begin
 d:=public.playground_teacher_names();
 if not exists(select 1 from jsonb_array_elements(d) n
  where n->>'user_id'='00000000-0000-0000-0000-000000000002' and n->>'display_name'='Sample Student')
 then raise exception 'Saved teacher display name not returned';end if;
end $$;
select public.playground_teacher_save_names(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","display_name":"Updated Student"}]'::jsonb);
do $$ begin
 if not exists(select 1 from jsonb_array_elements(public.playground_teacher_names()) n
  where n->>'display_name'='Updated Student')
 then raise exception 'Saved teacher display name was not updated';end if;
end $$;
-- A student must not see or update teacher display names.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin
 begin perform public.playground_teacher_names();raise exception 'Student read private names';
 exception when insufficient_privilege then null;end;
 begin
  perform public.playground_teacher_save_names(
   '[{"user_id":"00000000-0000-0000-0000-000000000002","display_name":"Invalid"}]'::jsonb);
  raise exception 'Student saved private names';
 exception when insufficient_privilege then null;end;
end $$;
-- Other teacher groups cannot read this teacher's names.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 if jsonb_array_length(public.playground_teacher_names())<>0
 then raise exception 'Teacher name leaked across groups';end if;
end $$;
-- The teacher can clear an override to return to GitHub fallback.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_teacher_save_names(
 '[{"user_id":"00000000-0000-0000-0000-000000000002","display_name":""}]'::jsonb);
do $$ begin
 if jsonb_array_length(public.playground_teacher_names())<>0
 then raise exception 'Clearing a teacher name did not remove its override';end if;
end $$;
reset role;
select 'PASS: teacher-approved names save, edit, clear, and remain teacher-group isolated' as result;
