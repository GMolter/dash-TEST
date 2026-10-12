import { createClient } from '@supabase/supabase-js';
import { requireAdminAccess } from '../_utils/adminAccess.js';
import { getSupabaseServiceConfig } from '../_utils/supabaseConfig.js';
import { ADMIN_RESOURCES } from '../_utils/adminResources.js';
import { permittedResource, projectAdminRow } from '../_utils/adminPermissions.js';
export const config = { runtime: 'nodejs' };
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const access = await requireAdminAccess(req);
    if (access.ok === false) return res.status(access.status).json({ error: access.error });
    if (req.method !== 'GET') return res.status(405).json({ error: 'Help article mutations must use the audited admin data endpoint.' });
    const resource = permittedResource(access, ADMIN_RESOURCES['help-articles']);
    const cfg = getSupabaseServiceConfig();
    if (cfg.ok === false) return res.status(503).json({ error: 'Service unavailable' });
    const service = createClient(cfg.url, cfg.serviceKey);
    const { data, error } = await service.from(resource.table).select(resource.fields.map(field => field.name).join(',') || 'id').order(resource.sortFields.includes('sort_order') ? 'sort_order' : resource.sortFields[0] || 'id');
    if (error) throw error;
    return res.status(200).json({ articles: (data || []).map(row => projectAdminRow(access, resource, row)) });
  } catch (error: any) {
    return res.status(error.message === 'PERMISSION_DENIED' ? 403 : 503).json({ error: error.message === 'PERMISSION_DENIED' ? 'Permission denied' : 'Help articles unavailable' });
  }
}
