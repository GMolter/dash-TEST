import { createClient } from "@supabase/supabase-js";
import { isAuthed } from "./session.js";
import { getSupabaseServiceConfig } from "./supabaseConfig.js";

type AccessResult =
  | { ok: true; userId: string; email: string | null; appOwner: boolean }
  | { ok: false; status: number; error: string };

function readBearerToken(req: any) {
  const raw = req.headers?.authorization || req.headers?.Authorization || "";
  const value = String(raw);
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

export async function resolveAppAdminFromRequest(req: any): Promise<AccessResult> {
  const cfg = getSupabaseServiceConfig();
  if (cfg.ok === false) {
    return { ok: false, status: 403, error: "Unauthorized Account" };
  }

  const accessToken = readBearerToken(req);
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      error: "You must be signed into the app before using App Admin.",
    };
  }

  const supabase = createClient(cfg.url, cfg.serviceKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Invalid auth session" };
  }

  let profileResult = await supabase
    .from("profiles")
    .select("app_admin,app_owner,email")
    .eq("id", userData.user.id)
    .maybeSingle();

  // A code-first deployment should not lock out existing admins while the new
  // migration is still being applied. Owner-only features remain unavailable.
  if (profileResult.error?.code === "42703") {
    const legacyResult = await supabase
      .from("profiles")
      .select("app_admin,email")
      .eq("id", userData.user.id)
      .maybeSingle();
    profileResult = {
      data: legacyResult.data ? { ...legacyResult.data, app_owner: false } : null,
      error: legacyResult.error,
    } as typeof profileResult;
  }

  const { data: profile, error: profileError } = profileResult;

  if (profileError) {
    if (profileError.code === "42703") {
      return { ok: false, status: 403, error: "Unauthorized Account" };
    }
    return { ok: false, status: 403, error: "Unauthorized Account" };
  }
  if (!profile?.app_admin) {
    return { ok: false, status: 403, error: "Unauthorized Account" };
  }

  return { ok: true, userId: userData.user.id, email: profile.email || null, appOwner: profile.app_owner === true };
}

export async function requireAdminAccess(
  req: any,
  options?: { requirePasswordSession?: boolean }
): Promise<AccessResult> {
  const requirePasswordSession = options?.requirePasswordSession ?? true;

  if (requirePasswordSession) {
    const cookieSecret = process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD;
    if (!cookieSecret) return { ok: false, status: 403, error: "Unauthorized Account" };
    if (!isAuthed(req, cookieSecret)) return { ok: false, status: 401, error: "Unauthorized" };
  }

  return resolveAppAdminFromRequest(req);
}
