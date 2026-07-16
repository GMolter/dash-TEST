begin;
select no_plan();

select has_table('public', 'launcher_pairing_requests', 'pairing request table exists');
select has_table('public', 'launcher_devices', 'launcher device table exists');
select has_table('public', 'launcher_rate_limits', 'rate-limit table exists');
select has_index('public', 'launcher_pairing_requests', 'launcher_pairing_active_code_idx', 'active display-code hashes are unique');
select has_index('public', 'launcher_pairing_requests', 'launcher_pairing_one_active_device_idx', 'one active request per stable device is enforced');
select has_index('public', 'launcher_devices', 'launcher_devices_credential_hash_idx', 'device credential hashes are unique');
select has_index('public', 'launcher_devices', 'launcher_devices_one_active_identifier_idx', 'one active credential per stable device is enforced');
select is((select relrowsecurity from pg_class where oid = 'public.launcher_devices'::regclass), true, 'device RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.launcher_pairing_requests'::regclass), true, 'pairing RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.launcher_rate_limits'::regclass), true, 'rate-limit RLS is enabled');
select is(has_column_privilege('authenticated', 'public.launcher_devices', 'credential_hash', 'select'), false, 'authenticated users cannot select credential hashes');
select is(has_table_privilege('anon', 'public.launcher_devices', 'select'), false, 'anonymous users cannot list devices');
select is(has_table_privilege('anon', 'public.launcher_pairing_requests', 'select'), false, 'anonymous users cannot enumerate pairing requests');
select is(has_table_privilege('authenticated', 'public.launcher_pairing_requests', 'select'), false, 'authenticated users cannot enumerate pairing requests directly');

select results_eq(
  $$select proname::text from pg_proc where pronamespace = 'public'::regnamespace
    and proname like '%launcher%' and prosecdef and coalesce(array_to_string(proconfig, ','), '') not like '%search_path=%'
    order by proname$$,
  $$select null::text where false$$,
  'every security-definer launcher function fixes its search path'
);

create function pg_temp.sqlstate_of(command text)
returns text language plpgsql as $$
begin execute command; return null;
exception when others then return sqlstate;
end; $$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'launcher-a@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'launcher-b@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

set local role service_role;

select results_eq(
  $$select outcome from public.create_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-0000-4000-8000-000000000001', 'User A laptop',
    decode(repeat('11', 32), 'hex'), decode(repeat('12', 32), 'hex'), decode(repeat('13', 32), 'hex'))$$,
  $$values ('waiting'::text)$$,
  'pairing request creation succeeds with hash-only inputs'
);
select is(
  public.poll_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('99', 32), 'hex'), decode(repeat('14', 32), 'hex')),
  'invalid', 'wrong pairing secret is rejected without detail'
);
select is(
  public.poll_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'bbbbbbbb-0000-4000-8000-000000000002', decode(repeat('11', 32), 'hex'), decode(repeat('14', 32), 'hex')),
  'invalid', 'device B cannot poll device A request'
);
select is(
  public.decide_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', decode(repeat('12', 32), 'hex'),
    '11111111-1111-4111-8111-111111111111', 'approve', decode(repeat('15', 32), 'hex')),
  'approved', 'authenticated server decision approves request for derived user A'
);
select results_eq(
  $$select outcome from public.exchange_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('11', 32), 'hex'),
    decode(repeat('21', 32), 'hex'), 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1', decode(repeat('16', 32), 'hex'))$$,
  $$values ('connected'::text)$$,
  'approved request exchanges exactly once'
);
select results_eq(
  $$select outcome from public.exchange_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('11', 32), 'hex'),
    decode(repeat('22', 32), 'hex'), 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa2', decode(repeat('16', 32), 'hex'))$$,
  $$values ('invalid'::text)$$,
  'exchange replay is rejected'
);
select is((select count(*) from public.launcher_devices where device_identifier = 'aaaaaaaa-0000-4000-8000-000000000001'), 1::bigint, 'replay cannot issue a second credential');
select is((select status from public.launcher_pairing_requests where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), 'exchanged', 'successful exchange consumes request atomically');

select results_eq(
  $$select outcome from public.create_launcher_pairing(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-0000-4000-8000-000000000002', 'User B laptop',
    decode(repeat('31', 32), 'hex'), decode(repeat('32', 32), 'hex'), decode(repeat('33', 32), 'hex'))$$,
  $$values ('waiting'::text)$$,
  'device B creates an independent request'
);
select is(public.decide_launcher_pairing(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', decode(repeat('32', 32), 'hex'),
  '22222222-2222-4222-8222-222222222222', 'approve', decode(repeat('34', 32), 'hex')),
  'approved', 'user B request is approved for user B');
select results_eq(
  $$select outcome from public.exchange_launcher_pairing(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-0000-4000-8000-000000000002', decode(repeat('31', 32), 'hex'),
    decode(repeat('41', 32), 'hex'), 'bbbbbbbb-dddd-4ddd-8ddd-bbbbbbbbbbb1', decode(repeat('35', 32), 'hex'))$$,
  $$values ('connected'::text)$$,
  'device B receives its own independent credential'
);
select results_eq(
  $$select outcome from public.create_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaaa-0000-4000-8000-000000000001', 'User A replacement',
    decode(repeat('17', 32), 'hex'), decode(repeat('18', 32), 'hex'), decode(repeat('19', 32), 'hex'))$$,
  $$values ('waiting'::text)$$,
  'device A can start an explicit replacement request'
);
select is(public.decide_launcher_pairing(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', decode(repeat('18', 32), 'hex'),
  '11111111-1111-4111-8111-111111111111', 'approve', decode(repeat('1a', 32), 'hex')),
  'approved', 'replacement approval remains owned by user A');
select results_eq(
  $$select outcome from public.exchange_launcher_pairing(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('17', 32), 'hex'),
    decode(repeat('41', 32), 'hex'), 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa3', decode(repeat('1b', 32), 'hex'))$$,
  $$values ('invalid'::text)$$,
  'a credential uniqueness failure rejects the replacement exchange'
);
select is(
  (select revoked_at from public.launcher_devices where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'),
  null::timestamptz,
  'failed replacement exchange rolls back revocation of the working credential'
);
select results_eq(
  $$select outcome from public.validate_launcher_device(
    'bbbbbbbb-0000-4000-8000-000000000002', decode(repeat('21', 32), 'hex'), decode(repeat('36', 32), 'hex'))$$,
  $$values ('invalid'::text)$$,
  'user A device credential cannot authenticate as device B'
);
select results_eq(
  $$select outcome from public.validate_launcher_device(
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('21', 32), 'hex'), decode(repeat('36', 32), 'hex'))$$,
  $$values ('connected'::text)$$,
  'device A credential authenticates only its own active device'
);

select results_eq(
  $$select outcome from public.create_launcher_pairing(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'cccccccc-0000-4000-8000-000000000003', 'Denied laptop',
    decode(repeat('51', 32), 'hex'), decode(repeat('52', 32), 'hex'), decode(repeat('53', 32), 'hex'))$$,
  $$values ('waiting'::text)$$,
  'denial test request is created'
);
select is(public.decide_launcher_pairing(
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', decode(repeat('52', 32), 'hex'),
  '11111111-1111-4111-8111-111111111111', 'deny', decode(repeat('54', 32), 'hex')),
  'denied', 'explicit denial is terminal');
select results_eq(
  $$select outcome from public.exchange_launcher_pairing(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'cccccccc-0000-4000-8000-000000000003', decode(repeat('51', 32), 'hex'),
    decode(repeat('55', 32), 'hex'), 'cccccccc-dddd-4ddd-8ddd-ccccccccccc1', decode(repeat('56', 32), 'hex'))$$,
  $$values ('invalid'::text)$$,
  'denied request cannot exchange'
);

insert into public.launcher_pairing_requests (
  id, device_identifier, device_name, pairing_secret_hash, approval_code_hash,
  status, created_at, expires_at
) values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-0000-4000-8000-000000000004',
  'Expired laptop', decode(repeat('61', 32), 'hex'), decode(repeat('62', 32), 'hex'),
  'waiting', now() - interval '11 minutes', now() - interval '1 minute'
);
select is(public.poll_launcher_pairing(
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-0000-4000-8000-000000000004',
  decode(repeat('61', 32), 'hex'), decode(repeat('63', 32), 'hex')),
  'expired', 'expired request becomes terminal during polling');
select is(public.cancel_launcher_pairing(
  '00000000-0000-4000-8000-000000000099', 'dddddddd-0000-4000-8000-000000000004', decode(repeat('61', 32), 'hex')),
  'invalid', 'unknown cancellation is non-enumerating');
select is(public.poll_launcher_pairing(
  '00000000-0000-4000-8000-000000000099', 'dddddddd-0000-4000-8000-000000000004',
  decode(repeat('61', 32), 'hex'), decode(repeat('63', 32), 'hex')),
  'invalid', 'unknown poll is non-enumerating');

select is(public.consume_launcher_rate_limit('test-limit', decode(repeat('71', 32), 'hex'), 2, 600), true, 'first rate-limited operation is allowed');
select is(public.consume_launcher_rate_limit('test-limit', decode(repeat('71', 32), 'hex'), 2, 600), true, 'second rate-limited operation is allowed');
select is(public.consume_launcher_rate_limit('test-limit', decode(repeat('71', 32), 'hex'), 2, 600), false, 'rate limit blocks the excess operation');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select device_name from public.list_launcher_devices()$$,
  $$values ('User A laptop'::text)$$,
  'user A lists only user A launcher devices'
);
select is(public.revoke_launcher_device('bbbbbbbb-dddd-4ddd-8ddd-bbbbbbbbbbb1'), false, 'user A cannot revoke user B device');
select is(
  pg_temp.sqlstate_of($$update public.launcher_devices set owner_id = '22222222-2222-4222-8222-222222222222' where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'$$),
  '42501', 'user A cannot change device ownership'
);
select is(
  pg_temp.sqlstate_of($$insert into public.launcher_devices (
    id, device_identifier, owner_id, device_name, credential_hash
  ) values (
    'eeeeeeee-dddd-4ddd-8ddd-eeeeeeeeeee1', 'eeeeeeee-0000-4000-8000-000000000005',
    '22222222-2222-4222-8222-222222222222', 'Spoofed', decode(repeat('81', 32), 'hex'))$$),
  '42501', 'user A cannot spoof device ownership'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select results_eq(
  $$select device_name from public.list_launcher_devices()$$,
  $$values ('User B laptop'::text)$$,
  'user B lists only user B launcher devices'
);
select results_eq(
  $$select device_name from public.launcher_devices$$,
  $$values ('User B laptop'::text)$$,
  'RLS prevents user B from reading user A device directly'
);
select is(public.revoke_launcher_device('aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'), false, 'user B cannot revoke user A device');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select is(public.revoke_launcher_device('aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'), true, 'user A can revoke user A device');

reset role;
set local role service_role;
select results_eq(
  $$select outcome from public.validate_launcher_device(
    'aaaaaaaa-0000-4000-8000-000000000001', decode(repeat('21', 32), 'hex'), decode(repeat('91', 32), 'hex'))$$,
  $$values ('invalid'::text)$$,
  'revocation immediately rejects later device authentication'
);
select is((select encode(credential_hash, 'hex') from public.launcher_devices where id = 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaa1'), repeat('21', 32), 'database retains only the supplied credential hash');
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('launcher_devices', 'launcher_pairing_requests') and column_name in ('credential', 'pairing_secret', 'display_code')), 0::bigint, 'no raw credential, pairing-secret, or display-code column exists');

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select is(
  pg_temp.sqlstate_of($$select * from public.list_launcher_devices()$$),
  '42501', 'unauthenticated device listing is denied'
);
select is(
  pg_temp.sqlstate_of($$select public.revoke_launcher_device('bbbbbbbb-dddd-4ddd-8ddd-bbbbbbbbbbb1')$$),
  '42501', 'unauthenticated revocation is denied'
);

select * from finish();
rollback;
