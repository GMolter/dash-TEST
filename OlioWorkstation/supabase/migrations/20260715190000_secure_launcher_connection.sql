/*
  # Milestone 5: secure Olio Launcher connection

  This migration creates only device authorization. It deliberately creates no
  Quick Paste synchronization function, scope, cache, or device content endpoint.
  The Workstation server hashes all random secrets with SHA-256 before invoking
  these functions; only 32-byte hashes are accepted here.
*/

create table public.launcher_devices (
  id uuid primary key,
  device_identifier uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  credential_hash bytea not null,
  scopes text[] not null default array['connection:status']::text[],
  approved_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint launcher_devices_name_length
    check (char_length(btrim(device_name)) between 1 and 80),
  constraint launcher_devices_name_safe
    check (device_name !~ '[[:cntrl:]]'),
  constraint launcher_devices_credential_hash_length
    check (octet_length(credential_hash) = 32),
  constraint launcher_devices_scopes_milestone5
    check (scopes = array['connection:status']::text[])
);

create unique index launcher_devices_credential_hash_idx
  on public.launcher_devices (credential_hash);
create unique index launcher_devices_one_active_identifier_idx
  on public.launcher_devices (device_identifier)
  where revoked_at is null;
create index launcher_devices_owner_status_idx
  on public.launcher_devices (owner_id, revoked_at, approved_at desc);

create table public.launcher_pairing_requests (
  id uuid primary key,
  device_identifier uuid not null,
  device_name text not null,
  pairing_secret_hash bytea not null,
  approval_code_hash bytea not null,
  status text not null default 'waiting',
  owner_id uuid references auth.users(id) on delete cascade,
  device_id uuid references public.launcher_devices(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  exchanged_at timestamptz,
  last_poll_at timestamptz,
  poll_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint launcher_pairing_name_length
    check (char_length(btrim(device_name)) between 1 and 80),
  constraint launcher_pairing_name_safe
    check (device_name !~ '[[:cntrl:]]'),
  constraint launcher_pairing_secret_hash_length
    check (octet_length(pairing_secret_hash) = 32),
  constraint launcher_pairing_code_hash_length
    check (octet_length(approval_code_hash) = 32),
  constraint launcher_pairing_status_valid
    check (status in ('waiting', 'approved', 'denied', 'exchanged', 'expired', 'cancelled')),
  constraint launcher_pairing_expiry_valid
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint launcher_pairing_owner_state
    check ((status in ('approved', 'exchanged') and owner_id is not null)
      or (status not in ('approved', 'exchanged'))),
  constraint launcher_pairing_device_state
    check ((status = 'exchanged' and device_id is not null and exchanged_at is not null)
      or (status <> 'exchanged' and device_id is null and exchanged_at is null)),
  constraint launcher_pairing_approval_state
    check ((status in ('approved', 'exchanged') and approved_at is not null)
      or (status not in ('approved', 'exchanged'))),
  constraint launcher_pairing_poll_count_nonnegative check (poll_count >= 0)
);

create unique index launcher_pairing_active_code_idx
  on public.launcher_pairing_requests (approval_code_hash)
  where status in ('waiting', 'approved');
create unique index launcher_pairing_one_active_device_idx
  on public.launcher_pairing_requests (device_identifier)
  where status in ('waiting', 'approved');
create index launcher_pairing_expiry_idx
  on public.launcher_pairing_requests (expires_at)
  where status in ('waiting', 'approved');
create index launcher_pairing_owner_idx
  on public.launcher_pairing_requests (owner_id, created_at desc)
  where owner_id is not null;

create table public.launcher_rate_limits (
  scope text not null,
  actor_hash bytea not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, actor_hash),
  constraint launcher_rate_scope_length check (char_length(scope) between 1 and 40),
  constraint launcher_rate_actor_hash_length check (octet_length(actor_hash) = 32),
  constraint launcher_rate_count_nonnegative check (request_count >= 0)
);

create index launcher_rate_limits_cleanup_idx
  on public.launcher_rate_limits (window_started_at);

create or replace function public.set_launcher_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger launcher_devices_set_updated_at
before update on public.launcher_devices
for each row execute function public.set_launcher_updated_at();

create trigger launcher_pairing_set_updated_at
before update on public.launcher_pairing_requests
for each row execute function public.set_launcher_updated_at();

create or replace function public.consume_launcher_rate_limit(
  p_scope text,
  p_actor_hash bytea,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_value timestamptz := clock_timestamp();
  current_count integer;
begin
  if p_scope is null or char_length(p_scope) not between 1 and 40
     or octet_length(p_actor_hash) <> 32
     or p_limit not between 1 and 1000
     or p_window_seconds not between 1 and 86400 then
    return false;
  end if;

  insert into public.launcher_rate_limits (
    scope, actor_hash, window_started_at, request_count, updated_at
  ) values (p_scope, p_actor_hash, now_value, 1, now_value)
  on conflict (scope, actor_hash) do update
  set window_started_at = case
        when public.launcher_rate_limits.window_started_at
          <= now_value - make_interval(secs => p_window_seconds)
          then now_value
        else public.launcher_rate_limits.window_started_at
      end,
      request_count = case
        when public.launcher_rate_limits.window_started_at
          <= now_value - make_interval(secs => p_window_seconds)
          then 1
        else public.launcher_rate_limits.request_count + 1
      end,
      updated_at = now_value
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

create or replace function public.create_launcher_pairing(
  p_request_id uuid,
  p_device_identifier uuid,
  p_device_name text,
  p_pairing_secret_hash bytea,
  p_approval_code_hash bytea,
  p_actor_hash bytea
)
returns table(outcome text, created_request_id uuid, created_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expires_value timestamptz := clock_timestamp() + interval '10 minutes';
begin
  if not public.consume_launcher_rate_limit('pair-create', p_actor_hash, 5, 600) then
    return query select 'rate_limited'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if p_request_id is null or p_device_identifier is null
     or p_device_name is null
     or char_length(btrim(p_device_name)) not between 1 and 80
     or p_device_name ~ '[[:cntrl:]]'
     or octet_length(p_pairing_secret_hash) <> 32
     or octet_length(p_approval_code_hash) <> 32 then
    return query select 'invalid'::text, null::uuid, null::timestamptz;
    return;
  end if;

  update public.launcher_pairing_requests
  set status = 'expired'
  where device_identifier = p_device_identifier
    and status in ('waiting', 'approved')
    and expires_at <= clock_timestamp();

  begin
    insert into public.launcher_pairing_requests (
      id, device_identifier, device_name, pairing_secret_hash,
      approval_code_hash, expires_at
    ) values (
      p_request_id, p_device_identifier, btrim(p_device_name),
      p_pairing_secret_hash, p_approval_code_hash, expires_value
    );
  exception when unique_violation then
    return query select 'invalid'::text, null::uuid, null::timestamptz;
    return;
  end;

  return query select 'waiting'::text, p_request_id, expires_value;
end;
$$;

create or replace function public.inspect_launcher_pairing(
  p_request_id uuid,
  p_approval_code_hash bytea,
  p_actor_hash bytea
)
returns table(outcome text, safe_device_name text, request_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.launcher_pairing_requests%rowtype;
begin
  if not public.consume_launcher_rate_limit('pair-inspect', p_actor_hash, 20, 600) then
    return query select 'rate_limited'::text, null::text, null::timestamptz;
    return;
  end if;
  select * into request_row
  from public.launcher_pairing_requests
  where id = p_request_id and approval_code_hash = p_approval_code_hash
  for update;
  if not found then
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;
  if request_row.expires_at <= clock_timestamp()
     and request_row.status in ('waiting', 'approved') then
    update public.launcher_pairing_requests set status = 'expired'
    where id = request_row.id;
    request_row.status := 'expired';
  end if;
  if request_row.status <> 'waiting' then
    return query select request_row.status, null::text, request_row.expires_at;
    return;
  end if;
  return query select 'waiting'::text, request_row.device_name, request_row.expires_at;
end;
$$;

create or replace function public.decide_launcher_pairing(
  p_request_id uuid,
  p_approval_code_hash bytea,
  p_owner_id uuid,
  p_decision text,
  p_actor_hash bytea
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.launcher_pairing_requests%rowtype;
begin
  if p_owner_id is null or p_decision not in ('approve', 'deny') then
    return 'invalid';
  end if;
  if not public.consume_launcher_rate_limit('pair-decision', p_actor_hash, 10, 600) then
    return 'rate_limited';
  end if;
  select * into request_row
  from public.launcher_pairing_requests
  where id = p_request_id and approval_code_hash = p_approval_code_hash
  for update;
  if not found or request_row.status <> 'waiting' then return 'invalid'; end if;
  if request_row.expires_at <= clock_timestamp() then
    update public.launcher_pairing_requests set status = 'expired'
    where id = request_row.id;
    return 'expired';
  end if;
  if p_decision = 'deny' then
    update public.launcher_pairing_requests set status = 'denied'
    where id = request_row.id;
    return 'denied';
  end if;
  update public.launcher_pairing_requests
  set status = 'approved', owner_id = p_owner_id, approved_at = clock_timestamp()
  where id = request_row.id;
  return 'approved';
end;
$$;

create or replace function public.poll_launcher_pairing(
  p_request_id uuid,
  p_device_identifier uuid,
  p_pairing_secret_hash bytea,
  p_actor_hash bytea
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.launcher_pairing_requests%rowtype;
begin
  if not public.consume_launcher_rate_limit('pair-poll', p_actor_hash, 80, 600) then
    return 'rate_limited';
  end if;
  select * into request_row
  from public.launcher_pairing_requests
  where id = p_request_id
    and device_identifier = p_device_identifier
    and pairing_secret_hash = p_pairing_secret_hash
  for update;
  if not found then return 'invalid'; end if;
  if request_row.last_poll_at is not null
     and request_row.last_poll_at > clock_timestamp() - interval '2 seconds' then
    return 'waiting';
  end if;
  update public.launcher_pairing_requests
  set last_poll_at = clock_timestamp(), poll_count = poll_count + 1
  where id = request_row.id;
  if request_row.expires_at <= clock_timestamp()
     and request_row.status in ('waiting', 'approved') then
    update public.launcher_pairing_requests set status = 'expired'
    where id = request_row.id;
    return 'expired';
  end if;
  return request_row.status;
end;
$$;

create or replace function public.exchange_launcher_pairing(
  p_request_id uuid,
  p_device_identifier uuid,
  p_pairing_secret_hash bytea,
  p_credential_hash bytea,
  p_device_record_id uuid,
  p_actor_hash bytea
)
returns table(outcome text, connected_device_id uuid, connected_device_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.launcher_pairing_requests%rowtype;
begin
  if not public.consume_launcher_rate_limit('pair-exchange', p_actor_hash, 12, 600)
     or octet_length(p_credential_hash) <> 32
     or p_device_record_id is null then
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end if;
  select * into request_row
  from public.launcher_pairing_requests
  where id = p_request_id
    and device_identifier = p_device_identifier
    and pairing_secret_hash = p_pairing_secret_hash
  for update;
  if not found or request_row.status <> 'approved' then
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end if;
  if request_row.expires_at <= clock_timestamp() then
    update public.launcher_pairing_requests set status = 'expired'
    where id = request_row.id;
    return query select 'expired'::text, null::uuid, null::text;
    return;
  end if;

  begin
    -- Keep replacement revocation, insert, and request consumption in one
    -- subtransaction. A uniqueness failure must not revoke a working device.
    update public.launcher_devices
    set revoked_at = clock_timestamp()
    where device_identifier = p_device_identifier and revoked_at is null;

    insert into public.launcher_devices (
      id, device_identifier, owner_id, device_name, credential_hash
    ) values (
      p_device_record_id, p_device_identifier, request_row.owner_id,
      request_row.device_name, p_credential_hash
    );

    update public.launcher_pairing_requests
    set status = 'exchanged', device_id = p_device_record_id,
        exchanged_at = clock_timestamp()
    where id = request_row.id and status = 'approved';
  exception when unique_violation then
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end;
  return query select 'connected'::text, p_device_record_id, request_row.device_name;
end;
$$;

create or replace function public.cancel_launcher_pairing(
  p_request_id uuid,
  p_device_identifier uuid,
  p_pairing_secret_hash bytea
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.launcher_pairing_requests
  set status = 'cancelled'
  where id = p_request_id
    and device_identifier = p_device_identifier
    and pairing_secret_hash = p_pairing_secret_hash
    and status in ('waiting', 'approved')
    and expires_at > clock_timestamp();
  return case when found then 'cancelled' else 'invalid' end;
end;
$$;

create or replace function public.validate_launcher_device(
  p_device_identifier uuid,
  p_credential_hash bytea,
  p_actor_hash bytea
)
returns table(outcome text, connected_device_name text, connected_at timestamptz, last_used_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_row public.launcher_devices%rowtype;
begin
  if not public.consume_launcher_rate_limit('device-status', p_actor_hash, 60, 600) then
    return query select 'rate_limited'::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  select * into device_row from public.launcher_devices
  where device_identifier = p_device_identifier
    and credential_hash = p_credential_hash
    and revoked_at is null
  for update;
  if not found then
    return query select 'invalid'::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  if device_row.last_used_at is null
     or device_row.last_used_at < clock_timestamp() - interval '5 minutes' then
    update public.launcher_devices set last_used_at = clock_timestamp()
    where id = device_row.id
    returning public.launcher_devices.last_used_at into device_row.last_used_at;
  end if;
  return query select 'connected'::text, device_row.device_name,
    device_row.approved_at, device_row.last_used_at;
end;
$$;

create or replace function public.disconnect_launcher_device(
  p_device_identifier uuid,
  p_credential_hash bytea
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.launcher_devices set revoked_at = clock_timestamp()
  where device_identifier = p_device_identifier
    and credential_hash = p_credential_hash
    and revoked_at is null;
  return case when found then 'disconnected' else 'invalid' end;
end;
$$;

create or replace function public.list_launcher_devices()
returns table(
  id uuid,
  device_identifier uuid,
  device_name text,
  connected_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  status text
)
language sql
security definer
set search_path = ''
stable
as $$
  select device.id, device.device_identifier, device.device_name,
    device.approved_at, device.last_used_at, device.revoked_at,
    case when device.revoked_at is null then 'connected' else 'revoked' end
  from public.launcher_devices as device
  where device.owner_id = auth.uid()
  order by device.approved_at desc, device.id;
$$;

create or replace function public.revoke_launcher_device(p_device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  update public.launcher_devices
  set revoked_at = clock_timestamp()
  where id = p_device_id and owner_id = auth.uid() and revoked_at is null;
  return found;
end;
$$;

create or replace function public.cleanup_launcher_connections()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
  deleted_count integer := 0;
begin
  update public.launcher_pairing_requests set status = 'expired'
  where status in ('waiting', 'approved') and expires_at <= clock_timestamp();
  get diagnostics affected = row_count;
  delete from public.launcher_pairing_requests
  where updated_at < clock_timestamp() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  delete from public.launcher_rate_limits
  where window_started_at < clock_timestamp() - interval '24 hours';
  return affected + deleted_count;
end;
$$;

alter table public.launcher_devices enable row level security;
alter table public.launcher_pairing_requests enable row level security;
alter table public.launcher_rate_limits enable row level security;

create policy launcher_devices_select_own
  on public.launcher_devices for select to authenticated
  using (auth.uid() = owner_id);

revoke all on table public.launcher_devices from public, anon, authenticated;
revoke all on table public.launcher_pairing_requests from public, anon, authenticated;
revoke all on table public.launcher_rate_limits from public, anon, authenticated;
grant select (id, device_identifier, device_name, approved_at, last_used_at, revoked_at, updated_at)
  on table public.launcher_devices to authenticated;

revoke all on function public.consume_launcher_rate_limit(text, bytea, integer, integer) from public;
revoke all on function public.create_launcher_pairing(uuid, uuid, text, bytea, bytea, bytea) from public;
revoke all on function public.inspect_launcher_pairing(uuid, bytea, bytea) from public;
revoke all on function public.decide_launcher_pairing(uuid, bytea, uuid, text, bytea) from public;
revoke all on function public.poll_launcher_pairing(uuid, uuid, bytea, bytea) from public;
revoke all on function public.exchange_launcher_pairing(uuid, uuid, bytea, bytea, uuid, bytea) from public;
revoke all on function public.cancel_launcher_pairing(uuid, uuid, bytea) from public;
revoke all on function public.validate_launcher_device(uuid, bytea, bytea) from public;
revoke all on function public.disconnect_launcher_device(uuid, bytea) from public;
revoke all on function public.cleanup_launcher_connections() from public;
grant execute on function public.consume_launcher_rate_limit(text, bytea, integer, integer) to service_role;
grant execute on function public.create_launcher_pairing(uuid, uuid, text, bytea, bytea, bytea) to service_role;
grant execute on function public.inspect_launcher_pairing(uuid, bytea, bytea) to service_role;
grant execute on function public.decide_launcher_pairing(uuid, bytea, uuid, text, bytea) to service_role;
grant execute on function public.poll_launcher_pairing(uuid, uuid, bytea, bytea) to service_role;
grant execute on function public.exchange_launcher_pairing(uuid, uuid, bytea, bytea, uuid, bytea) to service_role;
grant execute on function public.cancel_launcher_pairing(uuid, uuid, bytea) to service_role;
grant execute on function public.validate_launcher_device(uuid, bytea, bytea) to service_role;
grant execute on function public.disconnect_launcher_device(uuid, bytea) to service_role;
grant execute on function public.cleanup_launcher_connections() to service_role;

revoke all on function public.list_launcher_devices() from public, anon;
revoke all on function public.revoke_launcher_device(uuid) from public, anon;
grant execute on function public.list_launcher_devices() to authenticated;
grant execute on function public.revoke_launcher_device(uuid) to authenticated;

comment on column public.launcher_devices.scopes is
  'Milestone 5 permits connection status only. Quick Paste access requires a separate Milestone 6 design and migration.';
comment on function public.cleanup_launcher_connections() is
  'Marks active expired pairings, deletes pairing records after 24 hours, and removes stale rate-limit buckets; invoke from an approved server schedule.';
