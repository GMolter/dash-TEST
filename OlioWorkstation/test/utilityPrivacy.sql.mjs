// Run with node test/utilityPrivacy.sql.mjs; uses the existing local PostgreSQL test runtime.
const { PGlite } = await import(process.env.PGLITE_MODULE || '../.org-sql-test.local/package/dist/index.js');
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users values ('${me}'), ('${other}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function public.current_account_is_allowed() returns boolean language sql stable as $$ select auth.uid() is not null $$;
create function public.current_user_org_id() returns uuid language sql stable as $$ select '33333333-3333-4333-8333-333333333333'::uuid $$;
create table short_urls(id uuid primary key default gen_random_uuid(), short_code text unique, target_url text, clicks int default 0, org_id uuid);
create table secrets(id uuid primary key default gen_random_uuid(), secret_code text unique, content text not null, viewed boolean default false, expires_at timestamptz, org_id uuid);
alter table short_urls enable row level security; alter table secrets enable row level security;
grant usage on schema public,auth to anon,authenticated;
grant all on short_urls,secrets to anon,authenticated;
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261004120000_private_utilities.sql', import.meta.url), 'utf8'));
async function as(role, id = '') { await db.exec(`reset role; set test.uid='${id}'; set role ${role};`); }
async function scalar(sql) { return Object.values((await db.query(sql)).rows[0])[0]; }
await as('authenticated', me);
await db.exec(`insert into short_urls(short_code,target_url) values ('mine','https://example.com'); insert into secrets(secret_code,content,expires_at) values ('secret','private',now()+interval '1 hour');`);
assert.equal(await scalar("select visibility from short_urls where short_code='mine'"), 'personal');
assert.equal(await scalar("select reveal_secret('secret')"), 'private');
assert.equal(await scalar("select viewed from secrets where secret_code='secret'"), false);
await as('authenticated', other);
assert.equal(await scalar('select count(*) from secrets'), 0);
assert.equal(await scalar("select resolve_short_url('mine')"), null);
await as('anon');
assert.equal(await scalar('select count(*) from secrets'), 0);
assert.equal(await scalar("select resolve_short_url('mine')"), null);
assert.equal(await scalar("select reveal_secret('secret')"), 'private');
assert.equal(await scalar("select reveal_secret('secret')"), null);
await as('authenticated', me);
assert.equal(await scalar("select content from secrets where secret_code='secret'"), '');
await db.exec("update short_urls set visibility='shared',org_id=current_user_org_id() where short_code='mine'");
await as('authenticated', other);
assert.equal(await scalar("select resolve_short_url('mine')"), 'https://example.com');
await as('anon');
assert.equal(await scalar("select resolve_short_url('mine')"), null);
await as('authenticated', me);
await db.exec("update short_urls set visibility='public' where short_code='mine'");
await as('anon');
assert.equal(await scalar("select resolve_short_url('mine')"), 'https://example.com');
assert.equal((await db.query("update short_urls set target_url='https://attacker.test' returning id")).rows.length, 0);

await db.exec(`reset role;
create table public.profiles(id uuid primary key, app_admin boolean default false, app_owner boolean default false);
insert into profiles values ('${me}',true,false), ('${other}',true,true), ('33333333-3333-4333-8333-333333333333',false,false);
create schema storage; create table storage.objects(bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261004121000_admin_background_access.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261004122000_owner_record_access.sql', import.meta.url), 'utf8'));
await as('authenticated', me);
assert.equal(await scalar(`select can_admin_background('${other}/background')`), false);
assert.equal(await scalar("select can_admin_background('33333333-3333-4333-8333-333333333333/background')"), true);
await db.exec("insert into storage.objects values ('dashboard-backgrounds','33333333-3333-4333-8333-333333333333/background')");
await assert.rejects(db.exec(`insert into storage.objects values ('dashboard-backgrounds','${other}/background')`));
await as('authenticated', '33333333-3333-4333-8333-333333333333');
assert.equal(await scalar(`select can_admin_background('${me}/background')`), false);
await db.exec(`reset role; insert into profiles values ('44444444-4444-4444-8444-444444444444',true,true);`);
await as('authenticated', other);
assert.equal(await scalar("select can_admin_background('44444444-4444-4444-8444-444444444444/background')"), true);
await db.exec("insert into storage.objects values ('dashboard-backgrounds','44444444-4444-4444-8444-444444444444/background')");
assert.equal((await db.query("update storage.objects set name=name where name='44444444-4444-4444-8444-444444444444/background' returning name")).rows.length, 1);
await as('authenticated', me);
assert.equal((await db.query("select * from storage.objects where name='44444444-4444-4444-8444-444444444444/background'")).rows.length, 0);

// Self-deletion remains protected by RLS, including for consumed secrets.
await as('authenticated', other);
assert.equal((await db.query("delete from secrets where secret_code='secret' returning id")).rows.length, 0);
await as('anon');
assert.equal((await db.query("delete from secrets where secret_code='secret' returning id")).rows.length, 0);
await as('authenticated', me);
assert.equal((await db.query("delete from secrets where secret_code='secret' returning id")).rows.length, 1);
await db.exec("insert into secrets(secret_code,content,expires_at) values ('expired','old',now()-interval '1 hour'), ('active','keep',now()+interval '1 hour')");

// PGlite has no background worker extension. Capture the real migration's
// schedule, then execute that exact command to verify the cleanup predicate.
await db.exec(`reset role;
create schema cron;
create table cron.job(jobname text primary key, schedule text, command text);
create function cron.schedule(text,text,text) returns bigint language sql as $$
  insert into cron.job values ($1,$2,$3) on conflict(jobname) do update set schedule=$2,command=$3 returning 1::bigint
$$;`);
const cleanupMigration = readFileSync(new URL('../supabase/migrations/20261004123000_expired_secret_cleanup.sql', import.meta.url), 'utf8')
  .replace('create extension if not exists pg_cron with schema pg_catalog;', '');
await db.exec(cleanupMigration);
assert.equal(await scalar("select count(*) from secrets where secret_code='expired'"), 0);
assert.equal(await scalar("select content from secrets where secret_code='active'"), 'keep');
assert.equal(await scalar("select schedule from cron.job where jobname='delete-expired-secrets'"), '* * * * *');
await db.exec("insert into secrets(secret_code,content,expires_at) values ('later-expired','old',now()-interval '1 second')");
await db.exec(await scalar("select command from cron.job where jobname='delete-expired-secrets'"));
assert.equal(await scalar("select count(*) from secrets where secret_code='later-expired'"), 0);
assert.equal(await scalar("select content from secrets where secret_code='active'"), 'keep');
await db.close();

console.log('Utility SQL privacy checks passed');
