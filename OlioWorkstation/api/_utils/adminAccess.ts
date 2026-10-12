import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { getSupabaseServiceConfig } from './supabaseConfig.js';
import { ADMIN_CATALOG_VERSION, ADMIN_PERMISSION_CATALOG, hasPermission } from './adminPermissions.js';

export type AdminAccess = { ok: true; userId: string; email: string | null; appOwner: boolean; permissions: string[]; preset: string; accessVersion: string };
type AccessResult = AdminAccess | { ok: false; status: number; error: string };
export async function resolveAppAdminFromRequest(req: any): Promise<AccessResult> {
  const cfg = getSupabaseServiceConfig();
  if (!cfg.ok) return { ok: false, status: 503, error: 'Access verification unavailable' };
  const token = String(req.headers?.authorization || req.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { ok: false, status: 401, error: 'Invalid auth session' };
  const service = createClient(cfg.url, cfg.serviceKey);
  const { data: auth, error: authError } = await service.auth.getUser(token);
  if (authError || !auth.user) return { ok: false, status: authError?.status && authError.status >= 500 ? 503 : 401, error: 'Invalid auth session' };
  const id = auth.user.id;
  const [profileResult, banResult] = await Promise.all([
    service.from('profiles').select('app_admin,app_owner,email').eq('id', id).maybeSingle(),
    service.from('account_ban_state').select('banned_until').eq('user_id', id).maybeSingle(),
  ]);
  if (profileResult.error || banResult.error) return { ok: false, status: 503, error: 'Access verification unavailable' };
  const profile = profileResult.data;
  if (!profile) return { ok: false, status: 403, error: 'Account deleted' };
  if (banResult.data?.banned_until && !(Date.parse(banResult.data.banned_until) <= Date.now())) return { ok: false, status: 403, error: 'Account blocked' };
  if (!profile.app_admin) return { ok: false, status: 403, error: 'Admin access removed' };
  let permissions: string[] = [];
  let preset = 'owner';
  if (!profile.app_owner) {
    const [assignment, grants] = await Promise.all([
      service.from('admin_permission_assignments').select('preset,revision').eq('user_id', id).maybeSingle(),
      service.from('admin_permission_grants').select('permission_key').eq('user_id', id),
    ]);
    if (assignment.error || grants.error) return { ok: false, status: 503, error: 'Access verification unavailable' };
    if (!assignment.data || assignment.data.preset === 'standard') return { ok: false, status: 403, error: 'Admin access removed' };
    preset = assignment.data.preset;
    const access = { appOwner: false, permissions: (grants.data || []).map(row => row.permission_key) };
    permissions = ADMIN_PERMISSION_CATALOG.filter(item => hasPermission(access, item.key)).map(item => item.key).sort();
  }
  const appOwner = profile.app_owner === true;
  // Only effective access changes affect this version; expired bans and unrelated profile edits do not.
  const accessVersion = createHash('sha256').update(JSON.stringify({ id, appOwner, permissions, preset, catalogVersion: ADMIN_CATALOG_VERSION, status: 'active' })).digest('hex');
  return { ok: true, userId: id, email: profile.email || null, appOwner, permissions, preset, accessVersion };
}
export async function requireAdminAccess(req: any): Promise<AccessResult> {
  return resolveAppAdminFromRequest(req);
}
