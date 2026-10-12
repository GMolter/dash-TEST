-- Run only on a disposable database after both permission migrations. All changes roll back.
begin;
set local request.jwt.claim.role = 'service_role';
insert into auth.users(id,email) values
 ('e0000000-0000-4000-8000-000000000001','approval-owner@test.invalid'),
 ('e0000000-0000-4000-8000-000000000002','approval-target@test.invalid');
insert into public.profiles(id,email,app_admin,app_owner) values
 ('e0000000-0000-4000-8000-000000000001','approval-owner@test.invalid',true,true),
 ('e0000000-0000-4000-8000-000000000002','approval-target@test.invalid',false,false)
on conflict(id) do update set app_admin=excluded.app_admin,app_owner=excluded.app_owner;
insert into public.admin_access_requests(id,request_kind,target_user_id,requested_by,requested_by_email,reason,status)
values('e0000000-0000-4000-8000-000000000003','admin_promotion','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','approval-owner@test.invalid','Test approval','pending');
do $$ declare grants text[]; result public.admin_access_requests; begin
 if has_function_privilege('authenticated','public.admin_approve_with_permissions(uuid,uuid,text,text,text[],integer)','EXECUTE') then raise exception 'Browser can call approval RPC'; end if;
 select array_agg(key) into grants from public.admin_permission_catalog where not owner_only and not is_write and not protected;
 begin
  perform public.admin_approve_with_permissions('e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Test stale approval','read-only',grants,99);
  raise exception 'Stale approval succeeded';
 exception when serialization_failure then null;
 end;
 if exists(select 1 from public.admin_access_requests where id='e0000000-0000-4000-8000-000000000003' and (status<>'pending' or proposed_preset is not null)) then raise exception 'Failed approval changed request'; end if;
 result := public.admin_approve_with_permissions('e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Test explicit approval','read-only',grants,0);
 if result.status<>'approved' or result.proposed_preset<>'read-only' then raise exception 'Approval missing snapshot'; end if;
 if not public.admin_has_permission('e0000000-0000-4000-8000-000000000002','features.read') then raise exception 'Approved permissions missing'; end if;
 if public.admin_has_permission('e0000000-0000-4000-8000-000000000002','features.update') then raise exception 'Read-only approval granted write'; end if;
end $$;
rollback;
