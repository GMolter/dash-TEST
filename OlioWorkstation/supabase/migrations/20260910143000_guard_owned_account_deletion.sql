-- Preserve organizations and provide a clear deletion precondition.
-- This migration does not delete or transfer any account or organization.
begin;
create or replace function public.admin_review_access_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_review_reason text
)
returns public.admin_access_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.admin_access_requests;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_REVIEW_DECISION' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_review_reason, ''))) not between 3 and 500 then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_reviewer_id and app_owner = true
  ) then
    raise exception 'OWNER_REVIEW_REQUIRED'
      using errcode = '42501';
  end if;

  select * into request_row
  from public.admin_access_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING' using errcode = '23505';
  end if;

  if p_decision = 'approved' then
    perform pg_advisory_xact_lock(hashtextextended('public.profiles.admin_reviews', 0));
    perform 1 from public.profiles where id = request_row.target_user_id for update;
    if not found then
      raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
    end if;
    if request_row.request_kind = 'account_deletion' then
      if request_row.target_user_id = p_reviewer_id then
        raise exception 'SELF_LOCKOUT_BLOCKED' using errcode = '42501';
      end if;
      if exists (select 1 from public.profiles where id = request_row.target_user_id and app_owner) then
        raise exception 'OWNER_ACCOUNT_PROTECTED' using errcode = '42501';
      end if;
      if (select count(*) from public.profiles where app_admin) <= 1
        and exists (select 1 from public.profiles where id = request_row.target_user_id and app_admin) then
        raise exception 'LAST_ADMIN_BLOCKED' using errcode = '42501';
      end if;
      -- Check ownership independently of profile.org_id: legacy failed setup
      -- could insert an organization without assigning the owner's profile.
      if exists (select 1 from public.organizations where owner_id = request_row.target_user_id) then
        raise exception 'ACCOUNT_OWNS_ORGANIZATION' using errcode = '23503';
      end if;
      -- Account deletion and approval commit together; failures roll both back.
      delete from auth.users where id = request_row.target_user_id;
      if not found then
        raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
      end if;
    else
      update public.profiles set app_admin = true where id = request_row.target_user_id;
    end if;
  end if;

  update public.admin_access_requests
  set status = p_decision,
      reviewed_by = p_reviewer_id,
      review_reason = btrim(p_review_reason),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.admin_review_access_request(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_review_access_request(uuid, uuid, text, text)
  to service_role;

commit;


