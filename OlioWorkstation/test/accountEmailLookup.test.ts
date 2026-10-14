// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('lets anonymous sign-in distinguish emails without exposing auth records', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users(email text, deleted_at timestamptz);
      insert into auth.users values ('Known@example.com', null), ('deleted@example.com', now());`);
    await db.exec(readFileSync('supabase/migrations/20261014200000_account_email_lookup.sql', 'utf8'));
    await db.exec('set role anon');
    for (const [email, exists] of [[' known@EXAMPLE.com ', true], ['new@example.com', false], ['deleted@example.com', false], ['', false], [null, false]]) {
      const result = await db.query('select public.account_email_exists($1) as exists', [email]);
      expect(result.rows).toEqual([{ exists }]);
    }
    await expect(db.query('select * from auth.users')).rejects.toThrow(/permission denied/);
  } finally {
    await db.close();
  }
}, 30000);
