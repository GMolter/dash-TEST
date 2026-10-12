-- Run on a disposable, fully migrated Supabase database with psql -v ON_ERROR_STOP=1.
-- All fixtures and changes roll back. Never run against production.
begin;
set local request.jwt.claim.role = 'service_role';
insert into auth.users(id,email) values ('d0000000-0000-4000-8000-000000000001','permission-reader@test.invalid');
insert into public.profiles(id,email,app_admin,app_owner) values ('d0000000-0000-4000-8000-000000000001','permission-reader@test.invalid',true,false)
on conflict(id) do update set app_admin=true,app_owner=false;
insert into public.admin_permission_assignments(user_id,preset,preset_version) values ('d0000000-0000-4000-8000-000000000001','read-only',1);
insert into public.admin_permission_grants(user_id,permission_key)
select 'd0000000-0000-4000-8000-000000000001',key from public.admin_permission_catalog where not owner_only and not is_write and not protected;
insert into public.admin_feature_ideas(id,title,created_by) values ('d0000000-0000-4000-8000-000000000002','RLS fixture','d0000000-0000-4000-8000-000000000001');
do $$ begin
 if not public.admin_has_permission('d0000000-0000-4000-8000-000000000001','features.read') then raise exception 'reader missing view'; end if;
 if public.admin_has_permission('d0000000-0000-4000-8000-000000000001','features.update') then raise exception 'reader has write'; end if;
 if public.admin_has_permission('d0000000-0000-4000-8000-000000000001','users.set-access') then raise exception 'reader can assign'; end if;
 if has_table_privilege('authenticated','public.admin_permission_grants','INSERT') then raise exception 'browser can grant permissions'; end if;
 if has_function_privilege('authenticated','public.admin_replace_permissions(uuid,uuid,integer,text,integer,text[],text)','EXECUTE') then raise exception 'browser can invoke assignment RPC'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$ declare changed integer; begin
 if not exists(select 1 from public.admin_feature_ideas where id='d0000000-0000-4000-8000-000000000002') then raise exception 'read-only visibility missing'; end if;
 update public.admin_feature_ideas set title='forged update' where id='d0000000-0000-4000-8000-000000000002';
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'read-only mutation succeeded'; end if;
 begin
  insert into public.admin_feature_ideas(title) values('forged insert');
  raise exception 'read-only insert succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.profiles set app_owner=true where id=auth.uid();
  raise exception 'self-promotion succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local request.jwt.claim.role = 'service_role';
-- Verify optimistic concurrency and transactional rollback when audit insertion fails.
do $ declare owner_id uuid; rev integer; original_grants text[]; begin
 select id into owner_id from public.profiles where app_owner and app_admin limit 1;
 if owner_id is null then
   owner_id := 'd0000000-0000-4000-8000-000000000003';
   insert into auth.users(id,email) values(owner_id,'permission-owner@test.invalid');
   insert into public.profiles(id,email,app_admin,app_owner) values(owner_id,'permission-owner@test.invalid',true,true)
     on conflict(id) do update set app_admin=true,app_owner=true;
 end if;
 perform set_config('test.admin_owner',owner_id::text,true);
 select revision into rev from public.admin_permission_assignments where user_id='d0000000-0000-4000-8000-000000000001';
 select array_agg(permission_key) into original_grants from public.admin_permission_grants where user_id='d0000000-0000-4000-8000-000000000001';
 perform public.admin_replace_permissions(owner_id,'d0000000-0000-4000-8000-000000000001',rev,'read-only',1,original_grants,'test reviewed snapshot');
 begin
   perform public.admin_replace_permissions(owner_id,'d0000000-0000-4000-8000-000000000001',rev,'standard',1,'{}','test stale revision');
   raise exception 'stale revision overwrote newer permissions';
 exception when serialization_failure then null;
 end;
end $;
create function public.test_permission_audit_failure() returns trigger language plpgsql as $ begin
 if new.reason='simulate audit failure' then raise exception 'simulated audit unavailable'; end if;
 return new;
end $;
create trigger test_permission_audit_failure before insert on public.admin_audit_log for each row execute function public.test_permission_audit_failure();
do $ declare rev integer; begin
 select revision into rev from public.admin_permission_assignments where user_id='d0000000-0000-4000-8000-000000000001';
 begin
   perform public.admin_replace_permissions(current_setting('test.admin_owner')::uuid,'d0000000-0000-4000-8000-000000000001',rev,'standard',1,'{}','simulate audit failure');
   raise exception 'expected audit failure';
 exception when raise_exception then
   if sqlerrm<>'simulated audit unavailable' then raise; end if;
 end;
 if (select revision from public.admin_permission_assignments where user_id='d0000000-0000-4000-8000-000000000001')<>rev then raise exception 'failed transaction changed revision'; end if;
 if not public.admin_has_permission('d0000000-0000-4000-8000-000000000001','features.read') then raise exception 'failed transaction removed grants'; end if;
end $;
drop trigger test_permission_audit_failure on public.admin_audit_log;
drop function public.test_permission_audit_failure();
-- The legacy direct select must deny the entire row if any column is hidden.
delete from public.admin_permission_grants where user_id='d0000000-0000-4000-8000-000000000001' and permission_key='features.fields.plan_content.read';
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
do $$ begin
 if exists(select 1 from public.admin_feature_ideas where id='d0000000-0000-4000-8000-000000000002') then raise exception 'hidden plan leaked through direct select'; end if;
end $$;
reset role;
rollback;
