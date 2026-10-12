import { resolveAppAdminFromRequest } from '../_utils/adminAccess.js';
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const access = await resolveAppAdminFromRequest(req);
    if (access.ok === false) return res.status(access.status).json({ canAccessAdmin: false, accountStatus: access.status === 401 ? 'invalid-session' : access.error === 'Account blocked' ? 'blocked' : access.error === 'Account deleted' ? 'deleted' : 'active', error: access.error });
    return res.status(200).json({ canAccessAdmin: true, accountStatus: 'active', userId: access.userId, appOwner: access.appOwner, preset: access.preset, permissions: access.permissions, accessVersion: access.accessVersion });
  } catch { return res.status(503).json({ error: 'Access verification unavailable' }); }
}

