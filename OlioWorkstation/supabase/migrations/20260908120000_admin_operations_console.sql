-- Auditable application-admin operations. The browser roles have no direct access;
-- all reads and writes flow through the authenticated server-side admin API.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource text not null,
  target_ids text[] not null default '{}',
  reason text not null,
  changed_fields text[] not null default '{}',
  before_data jsonb,
  after_data jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_log_resource_idx
  on public.admin_audit_log (resource, created_at desc);

comment on table public.admin_audit_log is
  'Server-only audit trail for application-admin mutations and sensitive data reveals.';

-- Keep the organization owner column and profile roles consistent in one transaction.
create or replace function public.admin_transfer_organization_owner(
  p_organization_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_owner uuid;
begin
  select owner_id into previous_owner
  from public.organizations
  where id = p_organization_id
  for update;

  if previous_owner is null then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_new_owner_id and org_id = p_organization_id
  ) then
    raise exception 'New owner must be an organization member' using errcode = '23514';
  end if;

  update public.organizations set owner_id = p_new_owner_id where id = p_organization_id;
  update public.profiles set role = 'admin' where id = previous_owner and id <> p_new_owner_id;
  update public.profiles set role = 'owner' where id = p_new_owner_id;
end;
$$;

revoke all on function public.admin_transfer_organization_owner(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_transfer_organization_owner(uuid, uuid) to service_role;
