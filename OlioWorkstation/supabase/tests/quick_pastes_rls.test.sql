begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

select has_table('public', 'quick_pastes', 'Quick Pastes has a dedicated table');
select col_is_pk('public', 'quick_pastes', 'id', 'id is the primary key');
select col_not_null('public', 'quick_pastes', 'user_id', 'owner is required');
select col_not_null('public', 'quick_pastes', 'title', 'title is required');
select col_not_null('public', 'quick_pastes', 'content', 'content is required');
select col_not_null('public', 'quick_pastes', 'sort_order', 'sort order is required');
select col_not_null('public', 'quick_pastes', 'is_favorite', 'favorite state is required');
select col_not_null('public', 'quick_pastes', 'created_at', 'created timestamp is required');
select col_not_null('public', 'quick_pastes', 'updated_at', 'updated timestamp is required');
select col_has_default('public', 'quick_pastes', 'id', 'id has a UUID default');
select col_has_default('public', 'quick_pastes', 'sort_order', 'sort order has a default');
select col_has_default('public', 'quick_pastes', 'is_favorite', 'favorite state has a default');
select col_has_default('public', 'quick_pastes', 'created_at', 'created timestamp has a default');
select col_has_default('public', 'quick_pastes', 'updated_at', 'updated timestamp has a default');
select has_index('public', 'quick_pastes', 'quick_pastes_owner_order_idx', 'owner ordering is indexed');
select has_index('public', 'quick_pastes', 'quick_pastes_owner_category_idx', 'owner categories are indexed');
select has_index('public', 'quick_pastes', 'quick_pastes_owner_favorites_idx', 'owner favorites are indexed');
select is(
  (select relrowsecurity from pg_class where oid = 'public.quick_pastes'::regclass),
  true,
  'row-level security is enabled'
);
select results_eq(
  $$select policyname::text from pg_policies where schemaname = 'public' and tablename = 'quick_pastes' order by policyname$$,
  $$values ('quick_pastes_delete_own'), ('quick_pastes_insert_own'), ('quick_pastes_select_own'), ('quick_pastes_update_own')$$,
  'exactly four owner-only policies exist'
);
select has_trigger('public', 'quick_pastes', 'quick_pastes_set_updated_at', 'updated_at trigger exists');
select has_function('public', 'reorder_quick_pastes', array['uuid[]'], 'authenticated reorder function exists');

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

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'quick-paste-a@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'quick-paste-b@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.quick_pastes (id, user_id, title, content, category, sort_order)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Alpha', 'Harmless A', 'General', 0)$$,
  'user A can create an owned Quick Paste'
);
select lives_ok(
  $$insert into public.quick_pastes (id, user_id, title, content, sort_order)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Beta', 'Harmless B', 1)$$,
  'user A can create a second ordered Quick Paste'
);
select is(
  pg_temp.sqlstate_of($$insert into public.quick_pastes (user_id, title, content) values ('22222222-2222-4222-8222-222222222222', 'Spoofed', 'Blocked')$$),
  '42501',
  'user A cannot spoof user B ownership on insert'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select lives_ok(
  $$insert into public.quick_pastes (id, user_id, title, content, sort_order)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'Gamma', 'Harmless C', 0)$$,
  'user B can create an owned Quick Paste'
);
select results_eq(
  $$select count(*)::bigint from public.quick_pastes$$,
  $$values (1::bigint)$$,
  'user B sees only one owned row'
);
select results_eq(
  $$select id from public.quick_pastes where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$$,
  $$select null::uuid where false$$,
  'user B cannot read user A content'
);
select results_eq(
  $$update public.quick_pastes set title = 'Blocked' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning id$$,
  $$select null::uuid where false$$,
  'user B cannot edit user A data'
);
select results_eq(
  $$update public.quick_pastes set is_favorite = true where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning id$$,
  $$select null::uuid where false$$,
  'user B cannot favorite user A data'
);
select results_eq(
  $$delete from public.quick_pastes where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning id$$,
  $$select null::uuid where false$$,
  'user B cannot delete user A data'
);
select results_eq(
  $$insert into public.quick_pastes (user_id, title, content, category, sort_order)
    select '22222222-2222-4222-8222-222222222222', title, content, category, 1
    from public.quick_pastes where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    returning id$$,
  $$select null::uuid where false$$,
  'user B cannot duplicate an unreadable user A row'
);
select is(
  pg_temp.sqlstate_of($$select public.reorder_quick_pastes(array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid])$$),
  '22023',
  'user B cannot include user A data in a reorder'
);
select is(
  pg_temp.sqlstate_of($$update public.quick_pastes set user_id = '11111111-1111-4111-8111-111111111111' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'$$),
  '42501',
  'a user cannot change ownership'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select results_eq(
  $$select count(*)::bigint from public.quick_pastes$$,
  $$values (2::bigint)$$,
  'user A still owns both rows after user B attacks'
);
select results_eq(
  $$select is_favorite from public.quick_pastes where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$$,
  $$values (false)$$,
  'user A favorite state was not changed by user B'
);
select lives_ok(
  $$select public.reorder_quick_pastes(array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid])$$,
  'an owner can atomically reorder the complete collection'
);
select results_eq(
  $$select id from public.quick_pastes order by sort_order$$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid), ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid)$$,
  'the owned order is stable after reorder'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000000', true);
select set_config('request.jwt.claim.role', 'anon', true);
select is(
  pg_temp.sqlstate_of($$select count(*) from public.quick_pastes$$),
  '42501',
  'unauthenticated reads are denied'
);
select is(
  pg_temp.sqlstate_of($$insert into public.quick_pastes (user_id, title, content) values ('11111111-1111-4111-8111-111111111111', 'Anonymous', 'Blocked')$$),
  '42501',
  'unauthenticated inserts are denied'
);
select has_table('public', 'pastes', 'Pastebin remains on its separate table');
select results_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'quick_pastes'
      and column_name in ('paste_code', 'expires_at', 'views')$$,
  $$select null::text where false$$,
  'Quick Pastes has no Pastebin sharing columns'
);
select is(
  has_table_privilege('anon', 'public.quick_pastes', 'insert'),
  false,
  'anon has no Quick Paste insert grant'
);
select is(
  has_table_privilege('authenticated', 'public.quick_pastes', 'select'),
  true,
  'authenticated has a table grant constrained by RLS'
);
select is(
  pg_temp.sqlstate_of($$select public.reorder_quick_pastes(array[]::uuid[])$$),
  '42501',
  'unauthenticated reorder is denied'
);

select * from finish();
rollback;
