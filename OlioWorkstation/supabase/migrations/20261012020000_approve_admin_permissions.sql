-- Allow an owner to choose explicit permissions while approving an existing request.
begin;
create or replace function public.admin_approve_with_permissions(
 p_request_id uuid, p_reviewer_id uuid, p_review_reason text,
 p_preset text, p_grants text[], p_revision integer
) returns public.admin_access_requests
language plpgsql security definer set search_path='' as $$
declare request_row public.admin_access_requests;
begin
 if not exists(select 1 from public.profiles where id=p_reviewer_id and app_owner and app_admin)
 or exists(select 1 from public.account_ban_state where user_id=p_reviewer_id and banned_until>now()) then
  raise exception 'OWNER_REVIEW_REQUIRED' using errcode='42501';
 end if;
 select * into request_row from public.admin_access_requests where id=p_request_id for update;
 if not found then raise exception 'TARGET_NOT_FOUND' using errcode='P0002'; end if;
 if request_row.status<>'pending' then raise exception 'REQUEST_NOT_PENDING' using errcode='23505'; end if;
 if request_row.request_kind<>'admin_promotion' or p_preset is null or p_preset not in ('read-only','custom','full') or p_grants is null or p_revision is null then
  raise exception 'INVALID_PERMISSION_CHOICE_REQUIRED';
 end if;
 update public.admin_access_requests set proposed_preset=p_preset, proposed_version=1,
 proposed_grants=p_grants, proposed_revision=p_revision where id=p_request_id;
 -- Existing review and replacement functions validate grants and revision, enforce owner
 -- protection, and write the audit. Any failure rolls back this snapshot update too.
 return public.admin_review_access_request(p_request_id,p_reviewer_id,'approved',p_review_reason);
end $$;
revoke all on function public.admin_approve_with_permissions(uuid,uuid,text,text,text[],integer) from public,anon,authenticated;
grant execute on function public.admin_approve_with_permissions(uuid,uuid,text,text,text[],integer) to service_role;
commit;
