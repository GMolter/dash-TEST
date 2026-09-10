// Run with an installed @electric-sql/pglite, or pass its module path as argv[2].
// This database is entirely in memory; no network or Supabase connection is used.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const newcomer = '22222222-2222-4222-8222-222222222222';
const creator = '33333333-3333-4333-8333-333333333333';
const banned = '44444444-4444-4444-8444-444444444444';
const missing = '55555555-5555-4555-8555-555555555555';
let checks = 0;
async function expectFailure(sql, params, message) {
  await assert.rejects(db.query(sql, params), error => error.message.includes(message)); checks++;
}
async function asUser(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table auth.users(id uuid primary key, banned_until timestamptz, email text, raw_user_meta_data jsonb default '{}');
    create table public.organizations(id uuid primary key default gen_random_uuid(), name text not null, code text unique not null, owner_id uuid not null references auth.users);
    create table public.profiles(id uuid primary key references auth.users, org_id uuid references public.organizations, role text not null default 'member' check(role in ('member','admin','owner')), display_name text, email text, app_admin boolean default false, app_owner boolean default false);
    create table public.admin_access_requests(id uuid primary key default gen_random_uuid(), target_user_id uuid not null, request_kind text not null, status text default 'pending', reviewed_by uuid, review_reason text, reviewed_at timestamptz, updated_at timestamptz default now());
    create function public.current_account_is_allowed() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from auth.users where id = auth.uid() and (banned_until is null or banned_until <= now())) $$;
    alter table public.profiles enable row level security;
    alter table public.organizations enable row level security;
    grant usage on schema public, auth to authenticated, anon;
    grant select, update on public.profiles to authenticated;
    grant select on public.organizations to authenticated;
    create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
    -- No direct membership writes: the RPC must perform its own authorization.
    create policy reject_direct_membership on public.profiles for update to authenticated using(true) with check(false);
    insert into auth.users(id) values ('${owner}'),('${newcomer}'),('${creator}'),('${banned}'),('${missing}');
    update auth.users set banned_until = now() + interval '1 day' where id='${banned}';
    update auth.users set email='repair@example.invalid', raw_user_meta_data='{"display_name":"Repaired user","role":"owner","app_admin":true}' where id='${missing}';
    insert into public.profiles(id) values ('${owner}'),('${newcomer}'),('${creator}'),('${banned}');
    insert into public.organizations(name,code,owner_id) values ('Existing team','0936','${owner}');
    update public.profiles set org_id=(select id from public.organizations where code='0936'),role='owner' where id='${owner}';
  `);
  if (process.argv[3]) {
    await db.exec(readFileSync(process.argv[3], 'utf8'));
  } else {
    await db.exec(readFileSync('supabase/migrations/20260910140000_atomic_organization_setup.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20260910143000_guard_owned_account_deletion.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20260910144500_repair_current_profile.sql','utf8'));
  }
  await asUser(newcomer);
  await expectFailure('select public.join_organization_by_code($1)', ['936'], '4 digits');
  await expectFailure('select public.join_organization_by_code($1)', ['0000'], 'Organization not found');
  await expectFailure("update public.profiles set org_id=(select id from public.organizations limit 1) where id=auth.uid()", [], 'row-level security');
  const joined = (await db.query('select public.join_organization_by_code($1) as result', [' 0936 '])).rows[0].result;
  assert.equal(joined.profile.id,newcomer); assert.equal(joined.profile.role,'member'); assert.equal(joined.profile.org_id,joined.organization.id); checks++;
  await expectFailure('select public.create_organization_with_owner($1)', ['Other team'], 'Leave your current organization');
  await asUser(owner);
  const existing = (await db.query('select public.ensure_current_profile() as result')).rows[0].result;
  assert.equal(existing.role,'owner'); assert.equal(existing.org_id,joined.organization.id); checks++;
  const repeat = (await db.query("select public.join_organization_by_code('0936') as result")).rows[0].result;
  assert.equal(repeat.profile.role,'owner'); checks++;
  await asUser(creator);
  await expectFailure('select public.create_organization_with_owner($1)', ['  '], 'between 1 and 100');
  await expectFailure('select public.create_organization_with_owner($1)', ['x'.repeat(101)], 'between 1 and 100');
  const created = (await db.query('select public.create_organization_with_owner($1) as result', ['  New team  '])).rows[0].result;
  assert.equal(created.organization.name,'New team'); assert.equal(created.organization.owner_id,creator); assert.equal(created.profile.role,'owner'); assert.equal(created.profile.org_id,created.organization.id); assert.match(created.organization.code,/^\d{4}$/); checks++;
  await expectFailure("select public.join_organization_by_code('0936')", [], 'Leave your current organization');
  await asUser(banned);
  await expectFailure('select public.ensure_current_profile()', [], 'active account');
  await expectFailure("select public.join_organization_by_code('0936')", [], 'active account');
  await expectFailure("select public.create_organization_with_owner('Blocked')", [], 'active account');
  await asUser(missing);
  await expectFailure("select public.join_organization_by_code('0936')", [], 'profile is missing');
  await expectFailure("select public.create_organization_with_owner('Missing profile')", [], 'profile is missing');
  const repaired = (await db.query('select public.ensure_current_profile() as result')).rows[0].result;
  assert.equal(repaired.id,missing); assert.equal(repaired.org_id,null); assert.equal(repaired.role,'member'); assert.equal(repaired.app_admin,false); assert.equal(repaired.display_name,'Repaired user'); checks++;
  await asUser('');
  await expectFailure("select public.join_organization_by_code('0936')", [], 'active account');
  await db.exec('reset role; set role anon');
  await expectFailure('select public.ensure_current_profile()', [], 'permission denied');
  await expectFailure("select public.join_organization_by_code('0936')", [], 'permission denied');
  await expectFailure("select public.create_organization_with_owner('Anonymous')", [], 'permission denied');
  await db.exec(`reset role;
    create function public.reject_test_membership() returns trigger language plpgsql as $$ begin if new.id='${missing}' and new.org_id is not null then raise exception 'Simulated profile failure'; end if; return new; end $$;
    create trigger reject_test_membership before update on public.profiles for each row execute function public.reject_test_membership();`);
  const countBefore = (await db.query('select count(*) as count from public.organizations')).rows[0].count;
  await asUser(missing);
  await expectFailure("select public.create_organization_with_owner('Must roll back')", [], 'Simulated profile failure');
  await db.exec('reset role');
  assert.equal((await db.query('select count(*) as count from public.organizations')).rows[0].count,countBefore); checks++;
  assert.equal((await db.query('select org_id from public.profiles where id=$1',[missing])).rows[0].org_id,null); checks++;
  // Simulate the reported legacy partial setup: null org_id but owns an org.
  await db.query('update public.profiles set org_id=null, role=$1 where id=$2', ['member',creator]);
  await db.query('update public.profiles set app_owner=true,app_admin=true where id=$1', [owner]);
  const request = (await db.query("insert into public.admin_access_requests(target_user_id,request_kind) values ($1,'account_deletion') returning id", [creator])).rows[0].id;
  await db.exec('set role service_role');
  await expectFailure('select public.admin_review_access_request($1,$2,$3,$4)', [request,owner,'approved','Delete test account'], 'ACCOUNT_OWNS_ORGANIZATION');
  await db.exec('reset role');
  assert.equal((await db.query('select status from public.admin_access_requests where id=$1',[request])).rows[0].status,'pending'); checks++;
  assert.equal((await db.query('select count(*)::int as count from auth.users where id=$1',[creator])).rows[0].count,1); checks++;
  console.log(`${checks} isolated PostgreSQL checks passed: profile repair, join/create, roles, grants, validation, bans, rollback, and owned-account deletion guard.`);
} finally { await db.close(); }
