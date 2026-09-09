-- Application ownership and reviewed app-admin elevation.
-- Owner assignment is intentionally explicit: after applying this migration, set
-- app_owner = true for the two chosen profiles from the Supabase SQL editor.

alter table public.profiles
  alter column app_admin set default false;

update public.profiles
set app_admin = false
where app_admin is null;

alter table public.profiles
  add column if not exists app_owner boolean not null default false;

comment on column public.profiles.app_owner is
  'Protected application-owner flag. At most two profiles may be owners; owners are always app admins.';

create or replace function public.protect_application_access_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_owner_count integer;
  caller_role text := coalesce(auth.role()::text, '');
begin
  if caller_role not in ('', 'service_role') then
    if (tg_op = 'INSERT' and (coalesce(new.app_admin, false) or coalesce(new.app_owner, false)))
      or (tg_op = 'UPDATE' and (
        new.app_admin is distinct from old.app_admin
        or new.app_owner is distinct from old.app_owner
      )) then
      raise exception 'APPLICATION_ACCESS_FLAGS_SERVER_MANAGED'
        using errcode = '42501';
    end if;
  end if;

  if new.app_owner then
    new.app_admin := true;
    perform pg_advisory_xact_lock(hashtextextended('public.profiles.app_owner.maximum_two', 0));
    select count(*) into existing_owner_count
    from public.profiles
    where app_owner = true
      and id is distinct from new.id;

    if existing_owner_count >= 2 then
      raise exception 'APP_OWNER_LIMIT'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_application_access_flags on public.profiles;
create trigger protect_application_access_flags
before insert or update of app_admin, app_owner on public.profiles
for each row execute function public.protect_application_access_flags();

create table if not exists public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_email text,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_access_requests enable row level security;
revoke all on table public.admin_access_requests from public, anon, authenticated;

create unique index if not exists admin_access_requests_one_pending_per_user
  on public.admin_access_requests (target_user_id)
  where status = 'pending';

create index if not exists admin_access_requests_pending_created_idx
  on public.admin_access_requests (created_at desc)
  where status = 'pending';

create index if not exists admin_access_requests_requester_idx
  on public.admin_access_requests (requested_by, created_at desc);

comment on table public.admin_access_requests is
  'Server-only requests for app-admin elevation. Only an app owner may approve or reject a pending request.';

create or replace function public.admin_review_access_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_review_reason text
)
returns public.admin_access_requests
language plpgsql
security invoker
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
    update public.profiles
    set app_admin = true
    where id = request_row.target_user_id;
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
