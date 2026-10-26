reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.playground_join_class(current_setting('test.join_code'),'Ignored name');
do $$ begin
 if (public.playground_classroom_context()->'memberships'->0->>'status')<>'approved' then raise exception 'Code did not auto-enroll';end if;
 begin perform public.playground_teacher_classes();raise exception 'Auto-enrollment granted teacher access';exception when insufficient_privilege then null;end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.playground_join_class(current_setting('test.join_code'),'Ignored name');
do $$ begin
 if (public.playground_classroom_context()->'memberships'->0->>'status')<>'removed' then raise exception 'Auto-join bypassed removal';end if;
 begin perform public.playground_join_class('INVALID','');raise exception 'Bad code accepted';exception when raise_exception then if sqlerrm='Bad code accepted' then raise;end if;end;
end $$;
reset role;
