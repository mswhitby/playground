-- TSI membership requires teacher approval, including for existing GitHub users.
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.playground_create_class('TSI Math Period 1','tsi-math');
select set_config('test.tsi_class',(public.playground_teacher_classes()->1->>'id'),false);
select set_config('test.tsi_code',(public.playground_teacher_classes()->1->>'join_code'),false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.playground_join_class(current_setting('test.tsi_code'),'Student B');
do $$ begin
 if not exists(select 1 from jsonb_array_elements(public.playground_classroom_context()->'memberships') m
   where m->>'course_id'='tsi-math' and m->>'status'='pending') then
   raise exception 'TSI student was not pending';end if;
 begin perform public.playground_teacher_bulk_tsi_enrollment(current_setting('test.tsi_class')::uuid,array[auth.uid()],'approve');
   raise exception 'Student approved own request';
 exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ begin
 begin perform public.playground_teacher_bulk_tsi_enrollment(current_setting('test.class_id')::uuid,array['00000000-0000-0000-0000-000000000004'::uuid],'approve');
   raise exception 'Bulk approval accepted non-TSI class';
 exception when invalid_parameter_value then null;end;
 begin perform public.playground_teacher_bulk_tsi_enrollment(current_setting('test.tsi_class')::uuid,array['00000000-0000-0000-0000-000000000004'::uuid,'00000000-0000-0000-0000-000000000002'::uuid],'approve');
   raise exception 'Bulk approval accepted mixed pending selection';
 exception when invalid_parameter_value then null;end;
 if (select status from playground_private.members where class_id=current_setting('test.tsi_class')::uuid and user_id='00000000-0000-0000-0000-000000000004')<>'pending' then
   raise exception 'Partial bulk approval occurred';end if;
 if public.playground_teacher_bulk_tsi_enrollment(current_setting('test.tsi_class')::uuid,array['00000000-0000-0000-0000-000000000004'::uuid],'approve')<>1 then
   raise exception 'Bulk approval count incorrect';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.playground_join_class(current_setting('test.tsi_code'),'Student B');
do $$ begin
 if not exists(select 1 from jsonb_array_elements(public.playground_classroom_context()->'memberships') m
   where m->>'course_id'='tsi-math' and m->>'status'='approved') then raise exception 'Rejoining reset approval';end if;
end $$;
reset role;
select 'PASS: TSI pending enrollment, teacher-only bulk approval, atomic selection, and approval retention' as result;
