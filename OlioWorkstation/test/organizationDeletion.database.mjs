// Run with an installed @electric-sql/pglite, or pass its module path as argv[2].
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.organizations(id integer primary key, owner_id uuid not null);
    alter table public.organizations enable row level security;
    grant usage on schema auth to authenticated;
    grant select, delete on public.organizations to authenticated;
    create policy read_orgs on public.organizations for select to authenticated using (true);
    create policy legacy_broad_delete on public.organizations for delete to authenticated using (true);
    insert into public.organizations values (1, '${owner}'), (2, '${other}');
  `);
  await db.exec(readFileSync('supabase/migrations/20260921131000_restrict_organization_deletion.sql', 'utf8'));
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await db.exec('set role authenticated');
  assert.equal((await db.query('delete from public.organizations where id = 2 returning id')).rows.length, 0);
  assert.equal((await db.query('delete from public.organizations where id = 1 returning id')).rows.length, 1);
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  assert.equal((await db.query('delete from public.organizations returning id')).rows.length, 0);
  assert.equal((await db.query('select * from public.organizations')).rows.length, 1);
  console.log('PASS: owner deletion allowed; non-owner and unauthenticated deletion blocked even with a broad existing policy.');
} finally { await db.close(); }
