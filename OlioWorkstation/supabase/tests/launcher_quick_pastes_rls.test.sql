begin;
select no_plan();

select has_function(
  'public',
  'fetch_launcher_quick_pastes',
  array['uuid', 'bytea', 'bytea', 'bytea'],
  'restricted launcher Quick Paste function exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.fetch_launcher_quick_pastes(uuid, bytea, bytea, bytea)',
    'execute'
  ),
  false,
  'authenticated browser sessions cannot execute the device read RPC'
);
select is(
  has_function_privilege(
    'anon',
    'public.fetch_launcher_quick_pastes(uuid, bytea, bytea, bytea)',
    'execute'
  ),
  false,
  'anonymous callers cannot execute the device read RPC'
);
select ok(
  (
    select prosecdef
      and coalesce(array_to_string(proconfig, ','), '') like '%search_path=%'
    from pg_proc
    where oid = 'public.fetch_launcher_quick_pastes(uuid, bytea, bytea, bytea)'::regprocedure
  ),
  'device read RPC is security-definer with a fixed search path'
);
select results_eq(
  $$select parameter_name::text
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'fetch_launcher_quick_pastes_%'
      and parameter_name in ('user_id', 'owner_id', 'email', 'account_id')$$,
  $$select null::text where false$$,
  'device read RPC accepts no launcher-supplied ownership value'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'm6-a@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'm6-b@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.quick_pastes (
  id, user_id, title, content, category, sort_order, is_favorite, created_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Synthetic second', 'Synthetic content two', 'General', 1, false, '2026-01-02T00:00:00Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Synthetic first', 'Synthetic content one', 'General', 0, true, '2026-01-01T00:00:00Z');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
insert into public.quick_pastes (
  id, user_id, title, content, category, sort_order, is_favorite
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '22222222-2222-4222-8222-222222222222',
  'Synthetic B',
  'Synthetic content B',
  'Support',
  0,
  false
);

reset role;
set local role service_role;

insert into public.launcher_devices (
  id, device_identifier, owner_id, device_name, credential_hash, scopes
) values
  (
    'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1',
    'aaaaaaaa-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Synthetic device A',
    decode(repeat('11', 32), 'hex'),
    array['connection:status', 'quick-pastes:read']
  ),
  (
    'bbbbbbbb-dddd-4ddd-8ddd-bbbbbbbbbbb1',
    'bbbbbbbb-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'Synthetic device B',
    decode(repeat('22', 32), 'hex'),
    array['connection:status', 'quick-pastes:read']
  ),
  (
    'cccccccc-dddd-4ddd-8ddd-ccccccccccc1',
    'cccccccc-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'Synthetic legacy device',
    decode(repeat('33', 32), 'hex'),
    array['connection:status']
  );

select results_eq(
  $$select outcome from public.fetch_launcher_quick_pastes(
    'aaaaaaaa-0000-4000-8000-000000000001',
    decode(repeat('11', 32), 'hex'),
    decode(repeat('41', 32), 'hex'),
    decode(repeat('42', 32), 'hex')
  )$$,
  $$values ('connected'::text)$$,
  'device A authenticates with its bound credential'
);
select is(
  (
    select jsonb_array_length(quick_paste_items)
    from public.fetch_launcher_quick_pastes(
      'aaaaaaaa-0000-4000-8000-000000000001',
      decode(repeat('11', 32), 'hex'),
      decode(repeat('43', 32), 'hex'),
      decode(repeat('44', 32), 'hex')
    )
  ),
  2,
  'user A launcher reads only user A collection size'
);
select is(
  (
    select quick_paste_items -> 0 ->> 'id'
    from public.fetch_launcher_quick_pastes(
      'aaaaaaaa-0000-4000-8000-000000000001',
      decode(repeat('11', 32), 'hex'),
      decode(repeat('45', 32), 'hex'),
      decode(repeat('46', 32), 'hex')
    )
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'launcher payload preserves stable Workstation ordering'
);
select is(
  (
    select (quick_paste_items -> 0) ? 'user_id'
      or (quick_paste_items -> 0) ? 'created_at'
      or (quick_paste_items -> 0) ? 'updated_at'
    from public.fetch_launcher_quick_pastes(
      'aaaaaaaa-0000-4000-8000-000000000001',
      decode(repeat('11', 32), 'hex'),
      decode(repeat('47', 32), 'hex'),
      decode(repeat('48', 32), 'hex')
    )
  ),
  false,
  'launcher payload omits ownership and internal timestamp fields'
);
select is(
  (
    select jsonb_array_length(quick_paste_items)
    from public.fetch_launcher_quick_pastes(
      'bbbbbbbb-0000-4000-8000-000000000002',
      decode(repeat('22', 32), 'hex'),
      decode(repeat('51', 32), 'hex'),
      decode(repeat('52', 32), 'hex')
    )
  ),
  1,
  'device B sees only user B collection'
);
select is(
  (
    select quick_paste_items -> 0 ->> 'id'
    from public.fetch_launcher_quick_pastes(
      'bbbbbbbb-0000-4000-8000-000000000002',
      decode(repeat('22', 32), 'hex'),
      decode(repeat('53', 32), 'hex'),
      decode(repeat('54', 32), 'hex')
    )
  ),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'user B cannot read user A Quick Pastes'
);
select results_eq(
  $$select outcome from public.fetch_launcher_quick_pastes(
    'bbbbbbbb-0000-4000-8000-000000000002',
    decode(repeat('11', 32), 'hex'),
    decode(repeat('55', 32), 'hex'),
    decode(repeat('56', 32), 'hex')
  )$$,
  $$values ('invalid'::text)$$,
  'device A credential cannot authenticate as device B'
);
select results_eq(
  $$select outcome from public.fetch_launcher_quick_pastes(
    'aaaaaaaa-0000-4000-8000-000000000001',
    decode(repeat('99', 32), 'hex'),
    decode(repeat('57', 32), 'hex'),
    decode(repeat('58', 32), 'hex')
  )$$,
  $$values ('invalid'::text)$$,
  'wrong credential is rejected without detail'
);
select results_eq(
  $$select outcome from public.fetch_launcher_quick_pastes(
    'cccccccc-0000-4000-8000-000000000003',
    decode(repeat('33', 32), 'hex'),
    decode(repeat('59', 32), 'hex'),
    decode(repeat('5a', 32), 'hex')
  )$$,
  $$values ('scope_required'::text)$$,
  'existing Milestone 5 device remains connection-only until reapproval'
);
select is(
  (
    select scopes
    from public.launcher_devices
    where id = 'cccccccc-dddd-4ddd-8ddd-ccccccccccc1'
  ),
  array['connection:status']::text[],
  'migration does not silently broaden an existing device'
);
select isnt(
  (
    select last_used_at
    from public.launcher_devices
    where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'
  ),
  null::timestamptz,
  'successful synchronization updates device last-used metadata'
);

create function pg_temp.exhaust_quick_paste_device_limit()
returns text
language plpgsql
as $$
declare
  current_outcome text := '';
begin
  for attempt in 1..31 loop
    select outcome
    into current_outcome
    from public.fetch_launcher_quick_pastes(
      'bbbbbbbb-0000-4000-8000-000000000002',
      decode(repeat('22', 32), 'hex'),
      decode(repeat('61', 32), 'hex'),
      decode(repeat('62', 32), 'hex')
    );
  end loop;
  return current_outcome;
end;
$$;

select is(
  pg_temp.exhaust_quick_paste_device_limit(),
  'rate_limited',
  'device synchronization rate limit blocks the excess request'
);

update public.launcher_devices
set revoked_at = clock_timestamp()
where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1';

select results_eq(
  $$select outcome from public.fetch_launcher_quick_pastes(
    'aaaaaaaa-0000-4000-8000-000000000001',
    decode(repeat('11', 32), 'hex'),
    decode(repeat('71', 32), 'hex'),
    decode(repeat('72', 32), 'hex')
  )$$,
  $$values ('invalid'::text)$$,
  'revocation immediately blocks later synchronization'
);
select is(
  (
    select encode(credential_hash, 'hex')
    from public.launcher_devices
    where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'
  ),
  repeat('11', 32),
  'database retains only the one-way credential hash'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'launcher_devices'
      and column_name = 'credential'
  ),
  0::bigint,
  'raw device credentials remain unrecoverable from database columns'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

create function pg_temp.sqlstate_of(command text)
returns text
language plpgsql
as $$
begin
  execute command;
  return null;
exception when others then
  return sqlstate;
end;
$$;

select is(
  pg_temp.sqlstate_of(
    $$select * from public.fetch_launcher_quick_pastes(
      'aaaaaaaa-0000-4000-8000-000000000001',
      decode(repeat('11', 32), 'hex'),
      decode(repeat('81', 32), 'hex'),
      decode(repeat('82', 32), 'hex')
    )$$
  ),
  '42501',
  'authenticated browser role cannot call the protected device RPC'
);

select * from finish();
rollback;
