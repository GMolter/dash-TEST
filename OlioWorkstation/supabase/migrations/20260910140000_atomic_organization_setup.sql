-- Run before deploying the organization setup UI. Both operations use the
-- authenticated caller, never a client-supplied user ID or membership role.
begin;

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

commit;
