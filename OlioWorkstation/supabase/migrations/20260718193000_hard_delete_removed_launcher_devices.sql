/*
  # Hard-delete removed launcher devices

  The original device foreign key used ON DELETE SET NULL, but an exchanged pairing
  request is constrained to have a non-null device_id. That made a direct device delete
  fail with launcher_pairing_device_state. Device removal now cascades its completed
  pairing record, deletes the device credential hash atomically, and leaves no owner-
  visible or database device-history row.
*/

alter table public.launcher_pairing_requests
  drop constraint launcher_pairing_requests_device_id_fkey;

alter table public.launcher_pairing_requests
  add constraint launcher_pairing_requests_device_id_fkey
  foreign key (device_id)
  references public.launcher_devices(id)
  on delete cascade;

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
     or p_credential_hash is null
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
    update public.launcher_pairing_requests
    set status = 'expired'
    where id = request_row.id;
    return query select 'expired'::text, null::uuid, null::text;
    return;
  end if;

  begin
    delete from public.launcher_devices
    where device_identifier = p_device_identifier;

    insert into public.launcher_devices (
      id,
      device_identifier,
      owner_id,
      device_name,
      credential_hash,
      scopes
    ) values (
      p_device_record_id,
      p_device_identifier,
      request_row.owner_id,
      request_row.device_name,
      p_credential_hash,
      array['connection:status', 'quick-pastes:read']::text[]
    );

    update public.launcher_pairing_requests
    set status = 'exchanged',
        device_id = p_device_record_id,
        exchanged_at = clock_timestamp()
    where id = request_row.id
      and status = 'approved';
  exception when unique_violation then
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end;

  return query
  select 'connected'::text, p_device_record_id, request_row.device_name;
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
  delete from public.launcher_devices
  where device_identifier = p_device_identifier
    and credential_hash = p_credential_hash
    and revoked_at is null;
  return case when found then 'disconnected' else 'invalid' end;
end;
$$;

create or replace function public.revoke_launcher_device(p_device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  delete from public.launcher_devices
  where id = p_device_id
    and owner_id = auth.uid();
  return found;
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
    'connected'::text
  from public.launcher_devices as device
  where device.owner_id = auth.uid()
    and device.revoked_at is null
  order by device.approved_at desc, device.id;
$$;

delete from public.launcher_devices
where revoked_at is not null;

revoke all on function public.exchange_launcher_pairing(
  uuid,
  uuid,
  bytea,
  bytea,
  uuid,
  bytea
) from public, anon, authenticated;
grant execute on function public.exchange_launcher_pairing(
  uuid,
  uuid,
  bytea,
  bytea,
  uuid,
  bytea
) to service_role;

revoke all on function public.disconnect_launcher_device(uuid, bytea)
  from public, anon, authenticated;
grant execute on function public.disconnect_launcher_device(uuid, bytea)
  to service_role;

revoke all on function public.revoke_launcher_device(uuid) from public, anon;
grant execute on function public.revoke_launcher_device(uuid) to authenticated;

revoke all on function public.list_launcher_devices() from public, anon;
grant execute on function public.list_launcher_devices() to authenticated;

comment on function public.list_launcher_devices() is
  'Returns only the signed-in owner''s active launcher devices. Removed devices and their completed pairing records are deleted.';
comment on function public.revoke_launcher_device(uuid) is
  'Deletes one launcher device owned by auth.uid(); the old credential immediately becomes invalid.';
comment on function public.disconnect_launcher_device(uuid, bytea) is
  'Deletes the exactly matched active launcher device; the old credential immediately becomes invalid.';

notify pgrst, 'reload schema';
