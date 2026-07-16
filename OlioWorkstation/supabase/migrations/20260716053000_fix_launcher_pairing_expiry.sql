/*
  Keep pairing creation and expiry on the same clock sample. The original function used
  clock_timestamp() for expiry while the created_at default used transaction-start now(),
  which could exceed the ten-minute constraint by a few milliseconds.
*/

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
  created_value timestamptz := clock_timestamp();
  expires_value timestamptz := created_value + interval '10 minutes';
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
      approval_code_hash, created_at, expires_at
    ) values (
      p_request_id, p_device_identifier, btrim(p_device_name),
      p_pairing_secret_hash, p_approval_code_hash, created_value, expires_value
    );
  exception when unique_violation then
    return query select 'invalid'::text, null::uuid, null::timestamptz;
    return;
  end;

  return query select 'waiting'::text, p_request_id, expires_value;
end;
$$;

revoke all on function public.create_launcher_pairing(uuid, uuid, text, bytea, bytea, bytea) from public;
grant execute on function public.create_launcher_pairing(uuid, uuid, text, bytea, bytea, bytea) to service_role;

notify pgrst, 'reload schema';
