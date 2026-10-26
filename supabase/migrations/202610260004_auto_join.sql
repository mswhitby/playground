begin;
create or replace function public.playground_join_class(p_code text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c playground_private.classes;member playground_private.members; account_name text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into c from playground_private.classes where join_code=upper(trim(p_code));
 if not found then raise exception 'Class code not found';end if;
 select coalesce(nullif(identity_data->>'user_name',''),nullif(identity_data->>'preferred_username',''),'GitHub student') into account_name from auth.identities where user_id=auth.uid() and provider='github' limit 1;
 if not found then raise exception 'GitHub sign-in required' using errcode='42501';end if;
 insert into playground_private.members(class_id,user_id,display_name,status) values(c.id,auth.uid(),account_name,'approved')
 on conflict(class_id,user_id) do update set display_name=excluded.display_name,status=case when playground_private.members.status='removed' then 'removed' else 'approved' end returning * into member;
 return jsonb_build_object('name',c.name,'status',member.status);
end $$;

-- Existing join requests also enroll immediately; removed memberships stay removed.
update playground_private.members set status='approved' where status='pending';
commit;
