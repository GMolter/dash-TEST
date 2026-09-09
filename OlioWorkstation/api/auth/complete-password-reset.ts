export const config = { runtime: "nodejs" };

import { createClient } from "@supabase/supabase-js";
import { accountIsAllowed } from "../_utils/accountAccess.js";
import { getSupabaseServiceConfig } from "../_utils/supabaseConfig.js";

function bearer(req: any) {
  const value = String(req.headers?.authorization || req.headers?.Authorization || "");
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function parseBody(raw: any) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (Buffer.isBuffer(raw)) {
    try { return JSON.parse(raw.toString("utf8")); } catch { return {}; }
  }
  return raw;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const cfg = getSupabaseServiceConfig();
    if (cfg.ok === false) return res.status(503).json({ error: cfg.error });
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const service = createClient(cfg.url, cfg.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: identityError } = await service.auth.getUser(token);
    if (identityError || !identity.user) return res.status(401).json({ error: "Invalid auth session" });
    if (!await accountIsAllowed(service, identity.user.id)) return res.status(403).json({ error: "Account access suspended" });
    if (identity.user.app_metadata?.force_password_change !== true) {
      return res.status(409).json({ error: "This account does not require a password change." });
    }

    const password = String(parseBody(req.body).password || "");
    if (password.length < 12) return res.status(400).json({ error: "Password must be at least 12 characters." });
    const { error } = await service.auth.admin.updateUserById(identity.user.id, {
      password,
      app_metadata: { ...(identity.user.app_metadata || {}), force_password_change: false },
    });
    if (error) return res.status(400).json({ error: error.message || "Password update failed." });
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("forced password change failed", { code: String(error?.code || error?.message || "UNKNOWN").slice(0, 100) });
    return res.status(500).json({ error: "Password update failed." });
  }
}
