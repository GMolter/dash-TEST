-- Run this ENTIRE file in a new Supabase SQL Editor query.
-- Clear any selected text before Run; do not run only a function body.
-- Reapplies the three organization/account repair function definitions.
-- Does not delete or transfer users or organizations.
-- Requires the existing account-ban and admin-review migrations.
begin;

-- 20260910140000_atomic_organization_setup.sql
-- Run before deploying the organization setup UI. Both operations use the
-- authenticated caller, never a client-supplied user ID or membership role.

create or replace function public.join_organization_by_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  member public.profiles%rowtype;
  organization public.organizations%rowtype;
begin
  if caller is null or not public.current_account_is_allowed() then
    raise exception 'Please sign in with an active account.' using errcode = '42501';
  end if;
  if p_code is null or btrim(p_code) !~ '^[0-9]{4}$' then
    raise exception 'Organization code must be 4 digits.' using errcode = '22023';
  end if;
  select * into member from public.profiles where id = caller for update;
  if not found then
    raise exception 'Your account profile is missing. Please contact support.' using errcode = 'P0001';
  end if;
  select * into organization from public.organizations where code = btrim(p_code) for share;
  if not found then
    raise exception 'Organization not found. Check the code and try again.' using errcode = 'P0001';
  end if;
  if member.org_id is not null and member.org_id <> organization.id then
    raise exception 'Leave your current organization before joining another.' using errcode = 'P0001';
  end if;
  -- A repeated request must not demote an existing owner or admin.
  if member.org_id is null then
    update public.profiles set org_id = organization.id, role = 'member'
    where id = caller returning * into member;
  end if;
  return jsonb_build_object('profile', to_jsonb(member), 'organization', to_jsonb(organization));
end;
$$;

create or replace function public.create_organization_with_owner(p_name text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  member public.profiles%rowtype;
  organization public.organizations%rowtype;
  candidate text;
  attempt integer;
begin
  if caller is null or not public.current_account_is_allowed() then
    raise exception 'Please sign in with an active account.' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) < 1 or length(btrim(p_name)) > 100 then
    raise exception 'Organization name must be between 1 and 100 characters.' using errcode = '22023';
  end if;
  select * into member from public.profiles where id = caller for update;
  if not found then
    raise exception 'Your account profile is missing. Please contact support.' using errcode = 'P0001';
  end if;
  if member.org_id is not null then
    raise exception 'Leave your current organization before creating another.' using errcode = 'P0001';
  end if;
  -- Serialize code allocation across this entrypoint; the unique constraint
  -- also protects against other callers creating or rotating an invite code.
  perform pg_advisory_xact_lock(hashtextextended('olio.organization.invite-code', 0));
  for attempt in 1..30 loop
    candidate := (1000 + floor(random() * 9000))::integer::text;
    if exists (select 1 from public.organizations where code = candidate) then continue; end if;
    begin
      insert into public.organizations(name, code, owner_id)
      values (btrim(p_name), candidate, caller) returning * into organization;
      exit;
    exception when unique_violation then
      if attempt = 30 then raise exception 'Could not allocate an organization code. Please try again.'; end if;
    end;
  end loop;
  if organization.id is null then
    raise exception 'Could not allocate an organization code. Please try again.';
  end if;
  update public.profiles set org_id = organization.id, role = 'owner'
  where id = caller returning * into member;
  return jsonb_build_object('profile', to_jsonb(member), 'organization', to_jsonb(organization));
end;
$$;

revoke all on function public.join_organization_by_code(text) from public, anon, authenticated;
revoke all on function public.create_organization_with_owner(text) from public, anon, authenticated;
grant execute on function public.join_organization_by_code(text) to authenticated;
grant execute on function public.create_organization_with_owner(text) to authenticated;

-- 20260910143000_guard_owned_account_deletion.sql
-- Preserve organizations and provide a clear deletion precondition.
-- This migration does not delete or transfer any account or organization.

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

-- 20260910144500_repair_current_profile.sql
-- Apply before deploying the login-loop fix. Existing profiles are preserved.

-- Repair legacy incomplete signups without resetting an existing membership.
create or replace function public.ensure_current_profile()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  member public.profiles%rowtype;
begin
  if caller is null or not public.current_account_is_allowed() then
    raise exception 'Please sign in with an active account.' using errcode = '42501';
  end if;
  select * into member from public.profiles where id = caller;
  if not found then
    insert into public.profiles(id, display_name, email, role)
    select u.id, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Olio user'), u.email, 'member'
    from auth.users u where u.id = caller
    on conflict (id) do nothing;
    select * into member from public.profiles where id = caller;
  end if;
  if member.id is null then
    raise exception 'Your account profile could not be loaded. Please try again.';
  end if;
  return to_jsonb(member);
end;
$$;
revoke all on function public.ensure_current_profile() from public, anon, authenticated;
grant execute on function public.ensure_current_profile() to authenticated;

commit;
