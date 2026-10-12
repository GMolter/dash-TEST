import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADMIN_PERMISSION_CATALOG } from '../api/_utils/adminPermissions';
describe('permission migration contract', () => {
 const sql = readFileSync('supabase/migrations/20261012010000_specific_admin_privileges.sql','utf8');
 it('freezes exactly the current catalog for explicit backfill', () => {
   const keys = [...sql.matchAll(/^\('([^']+)',/gm)].map(match => match[1]);
   expect(keys.sort()).toEqual(ADMIN_PERMISSION_CATALOG.map(item => item.key).sort());
   expect(new Set(keys).size).toBe(keys.length);
 });
 it('keeps assignment replacement, revision check, profile eligibility and audit in one transaction', () => {
   const body = sql.split('create function public.admin_replace_permissions')[1].split('end $$;')[0];
   for (const text of ['for update', 'PERMISSION_REVISION_CONFLICT', 'delete from public.admin_permission_grants', 'update public.profiles set app_admin', 'insert into public.admin_audit_log']) expect(body).toContain(text);
 });
});
