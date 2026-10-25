insert into playground_private.teacher_accounts values('other-teacher','other-school');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_create_class('Period 2','uil');
select set_config('test.class_id',(public.playground_teacher_classes()->0->>'id'),false);
select set_config('test.join_code',(public.playground_teacher_classes()->0->>'join_code'),false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.playground_join_class(current_setting('test.join_code'),'Student A');
do $$ begin
 if (public.playground_classroom_context()->>'is_teacher')::boolean then raise exception 'Student became teacher';end if;
 if (public.playground_classroom_context()->'memberships'->0->>'status')<>'pending' then raise exception 'Join self-approved';end if;
 if public.playground_activity_signal('10000000-0000-0000-0000-000000000001','uil','loops','edit',true,true) then raise exception 'Pending student activity saved';end if;
 begin perform public.playground_teacher_snapshot(current_setting('test.class_id')::uuid);raise exception 'Student read teacher snapshot';exception when insufficient_privilege then null;end;
 begin perform public.playground_set_member(current_setting('test.class_id')::uuid,auth.uid(),'approved');raise exception 'Student approved self';exception when insufficient_privilege then null;end;
 begin perform * from playground_private.members;raise exception 'Student accessed private roster';exception when insufficient_privilege then null;end;
end $$;
insert into public.playground_progress(course_id,activity_id,activity_kind,status) values('uil','loops','programming','completed'),('mobile-app-dev','private-other-course','lesson','completed');
insert into public.playground_attempts(course_id,activity_id,activity_kind) values('uil','loops','programming');
insert into public.playground_submissions(id,course_id,activity_id,activity_kind,files) values('20000000-0000-0000-0000-000000000001','uil','loops','programming','{"Loops.java":"submitted"}'),('20000000-0000-0000-0000-000000000002','mobile-app-dev','private-other-course','lesson','{"main":"not shared"}');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ declare s jsonb;begin
 s:=public.playground_teacher_snapshot(current_setting('test.class_id')::uuid);
 if jsonb_array_length(s->'practice')<>0 or jsonb_array_length(s->'submissions')<>0 then raise exception 'Pending work exposed';end if;
end $$;
select public.playground_set_member(current_setting('test.class_id')::uuid,'00000000-0000-0000-0000-000000000002','approved');
-- Both GitHub teacher accounts share this teacher group.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ declare s jsonb;begin
 if jsonb_array_length(public.playground_teacher_classes())<>1 then raise exception 'Second teacher account cannot see sections';end if;
 s:=public.playground_teacher_snapshot(current_setting('test.class_id')::uuid);
 if jsonb_array_length(s->'practice')<>1 or jsonb_array_length(s->'submissions')<>1 then raise exception 'Course isolation failed';end if;
 if (public.playground_teacher_submission(current_setting('test.class_id')::uuid,'20000000-0000-0000-0000-000000000001')->'files'->>'Loops.java')<>'submitted' then raise exception 'Submitted copy missing';end if;
 begin perform public.playground_teacher_submission(current_setting('test.class_id')::uuid,'20000000-0000-0000-0000-000000000002');raise exception 'Other course submission exposed';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.playground_activity_signal('10000000-0000-0000-0000-000000000001','uil','loops','edit',true,true);
do $$ begin
 if public.playground_activity_signal('10000000-0000-0000-0000-000000000002','mobile-app-dev','html','edit',true,true) then raise exception 'Unenrolled course activity accepted';end if;
end $$;
-- Different student cannot read peer work or teacher data.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$ begin
 if exists(select 1 from public.playground_progress) then raise exception 'Student peer progress disclosure';end if;
 begin perform public.playground_teacher_classes();raise exception 'Student read teacher sections';exception when insufficient_privilege then null;end;
end $$;
-- A teacher in another group cannot see this teacher's class.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 if jsonb_array_length(public.playground_teacher_classes())<>0 then raise exception 'Cross-teacher section disclosure';end if;
 begin perform public.playground_teacher_snapshot(current_setting('test.class_id')::uuid);raise exception 'Cross-teacher roster disclosure';exception when insufficient_privilege then null;end;
end $$;
-- Approval removal immediately removes dashboard and submitted-file access.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_set_member(current_setting('test.class_id')::uuid,'00000000-0000-0000-0000-000000000002','removed');
do $$ declare s jsonb;begin
 s:=public.playground_teacher_snapshot(current_setting('test.class_id')::uuid);
 if jsonb_array_length(s->'signals')<>0 or jsonb_array_length(s->'submissions')<>0 or jsonb_array_length(s->'practice')<>0 then raise exception 'Removed student work still shared';end if;
 begin perform public.playground_teacher_submission(current_setting('test.class_id')::uuid,'20000000-0000-0000-0000-000000000001');raise exception 'Removed student hand-in still shared';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.playground_join_class(current_setting('test.join_code'),'Student A');
do $$ begin
 if (public.playground_classroom_context()->'memberships'->0->>'status')<>'removed' then raise exception 'Rejoin bypassed teacher removal';end if;
 if public.playground_activity_signal('10000000-0000-0000-0000-000000000001','uil','loops','edit',true,true) then raise exception 'Removed student activity accepted';end if;
end $$;
set role anon;
do $$ begin
 begin perform public.playground_classroom_context();raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
 begin perform public.playground_activity_signal('10000000-0000-0000-0000-000000000001','uil','loops','edit',true,true);raise exception 'Guest activity saved';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- User-controlled metadata never grants a teacher role.
update auth.users set raw_user_meta_data='{"user_name":"deoncarlette","role":"teacher"}' where id='00000000-0000-0000-0000-000000000004';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$ begin if (public.playground_classroom_context()->>'is_teacher')::boolean then raise exception 'Editable metadata granted teacher';end if;end $$;
reset role;
select 'PASS: teacher identities, group isolation, approved course-only sharing, immutable hand-in access, removed-member revocation, and guest rejection' as result;
