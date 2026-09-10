begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  ('a1010101-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'olio-profile-test@example.invalid', '{"display_name":"  Test Person  ","role":"owner","app_admin":true}'),
  ('a2020202-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'olio-fallback@example.invalid', '{}');

select is((select count(*)::integer from public.profiles where id = 'a1010101-1111-4111-8111-111111111111'), 1, 'An unconfirmed account immediately has a profile');
select is((select display_name from public.profiles where id = 'a1010101-1111-4111-8111-111111111111'), 'Test Person', 'Display name is trimmed');
select is((select email from public.profiles where id = 'a1010101-1111-4111-8111-111111111111'), 'olio-profile-test@example.invalid', 'Profile email matches auth');
select is((select role::text from public.profiles where id = 'a1010101-1111-4111-8111-111111111111'), 'member', 'Signup metadata cannot grant an elevated role');
select is((select display_name from public.profiles where id = 'a2020202-2222-4222-8222-222222222222'), 'olio-fallback', 'Missing name falls back to email');
select ok(not has_function_privilege('anon', 'public.create_auth_user_profile()', 'execute'), 'Anonymous callers cannot invoke the trigger function');

select * from finish();
rollback;
