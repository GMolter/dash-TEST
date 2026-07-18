/*
  # Milestone 6: restricted launcher Quick Paste reads

  Existing Milestone 5 devices remain connection:status-only. New pairings approved
  after this migration receive quick-pastes:read as an additional disclosed scope.
  Copy and paste are local launcher actions and require no server-side write/use scope.
*/

alter table public.launcher_devices
  drop constraint launcher_devices_scopes_milestone5;

alter table public.launcher_devices
  add constraint launcher_devices_scopes_milestone6
  check (
    scopes = array['connection:status']::text[]
    or scopes = array['connection:status', 'quick-pastes:read']::text[]
  );

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
    update public.launcher_devices
    set revoked_at = clock_timestamp()
    where device_identifier = p_device_identifier
      and revoked_at is null;

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

create or replace function public.fetch_launcher_quick_pastes(
  p_device_identifier uuid,
  p_credential_hash bytea,
  p_source_actor_hash bytea,
  p_device_actor_hash bytea
)
returns table(
  outcome text,
  synchronized_at timestamptz,
  quick_paste_items jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  synchronized_value timestamptz := clock_timestamp();
  device_row public.launcher_devices%rowtype;
  item_count bigint;
  content_characters bigint;
  payload jsonb;
begin
  if p_device_identifier is null
     or p_credential_hash is null
     or octet_length(p_credential_hash) <> 32
     or p_source_actor_hash is null
     or octet_length(p_source_actor_hash) <> 32
     or p_device_actor_hash is null
     or octet_length(p_device_actor_hash) <> 32 then
    return query select 'invalid'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  if not public.consume_launcher_rate_limit(
    'quick-pastes-source',
    p_source_actor_hash,
    60,
    600
  ) then
    return query select 'rate_limited'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  select *
  into device_row
  from public.launcher_devices
  where device_identifier = p_device_identifier
    and credential_hash = p_credential_hash
    and revoked_at is null
  for update;

  if not found then
    return query select 'invalid'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  if not (
    device_row.scopes @> array['connection:status', 'quick-pastes:read']::text[]
  ) then
    return query select 'scope_required'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  if not public.consume_launcher_rate_limit(
    'quick-pastes-device',
    p_device_actor_hash,
    30,
    600
  ) then
    return query select 'rate_limited'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  select count(*), coalesce(sum(char_length(quick_paste.content)), 0)
  into item_count, content_characters
  from public.quick_pastes as quick_paste
  where quick_paste.user_id = device_row.owner_id;

  if item_count > 100 or content_characters > 500000 then
    return query select 'too_large'::text, null::timestamptz, null::jsonb;
    return;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', quick_paste.id,
        'title', quick_paste.title,
        'content', quick_paste.content,
        'category', quick_paste.category,
        'sort_order', quick_paste.sort_order,
        'is_favorite', quick_paste.is_favorite
      )
      order by quick_paste.sort_order, quick_paste.created_at, quick_paste.id
    ),
    '[]'::jsonb
  )
  into payload
  from public.quick_pastes as quick_paste
  where quick_paste.user_id = device_row.owner_id;

  update public.launcher_devices
  set last_used_at = synchronized_value
  where id = device_row.id;

  return query
  select 'connected'::text, synchronized_value, payload;
end;
$$;

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

revoke all on function public.fetch_launcher_quick_pastes(
  uuid,
  bytea,
  bytea,
  bytea
) from public, anon, authenticated;
grant execute on function public.fetch_launcher_quick_pastes(
  uuid,
  bytea,
  bytea,
  bytea
) to service_role;

comment on column public.launcher_devices.scopes is
  'Milestone 6 permits connection:status and, only for newly approved devices, quick-pastes:read. Existing Milestone 5 rows are not broadened.';
comment on function public.fetch_launcher_quick_pastes(uuid, bytea, bytea, bytea) is
  'Validates one unrevoked device identifier/credential pair, derives its owner, and returns only a bounded ordered Quick Paste read model.';

notify pgrst, 'reload schema';
