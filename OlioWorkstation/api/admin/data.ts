export const config = { runtime: "nodejs", maxDuration: 30 };

import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "../_utils/adminAccess.js";
import { getSupabaseServiceConfig } from "../_utils/supabaseConfig.js";
import {
  ADMIN_RESOURCE_LIST,
  ADMIN_RESOURCES,
  editableColumns,
  selectedColumns,
  sensitiveColumns,
  type AdminResource,
} from "../_utils/adminResources.js";

type OperationKind =
  | "create" | "update" | "delete" | "reveal"
  | "suspend" | "reactivate" | "reset-password"
  | "transfer-owner" | "regenerate-code"
  | "revoke" | "cancel" | "disconnect";

type AdminOperation = {
  resource: string;
  kind: OperationKind;
  ids?: string[];
  values?: Record<string, unknown>;
  revealFields?: string[];
  reason: string;
};

type TokenPayload = {
  v: 1;
  actor: string;
  operationId: string;
  digest: string;
  fingerprint: string;
  confirmation: string;
  exp: number;
};

const MAX_PAGE_SIZE = 100;
const MAX_BULK = 50;
const TOKEN_SECONDS = 5 * 60;
const SAFE_ID = /^[a-zA-Z0-9_:.,@+\-]{1,300}$/;
const AUDIT_REDACT = /(password|secret|token|credential|hash|cipher|content|webhook|url|\bcode\b)/i;

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

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("base64url");
}

function tokenSecret() {
  return process.env.ADMIN_OPERATION_SECRET || process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD || "";
}

function signPayload(payload: TokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readToken(raw: unknown): TokenPayload | null {
  if (typeof raw !== "string" || !tokenSecret()) return null;
  const [encoded, signature, extra] = raw.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    return payload?.v === 1 ? payload : null;
  } catch { return null; }
}

function queryValue(req: any, name: string) {
  const value = req.query?.[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function cleanSearch(value: string) {
  return value.trim().slice(0, 120).replace(/[%(),]/g, " ");
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item)).filter((item) => SAFE_ID.test(item)))];
}

function resourceId(resource: AdminResource, row: Record<string, any>) {
  return resource.primaryKey.split(",").map((key) => String(row[key] ?? "")).join("::");
}

function addAdminId(resource: AdminResource, row: Record<string, any>) {
  return { ...row, _admin_id: resourceId(resource, row) };
}

function applyId(query: any, resource: AdminResource, id: string) {
  const keys = resource.primaryKey.split(",");
  const values = id.split("::");
  if (keys.length !== values.length) throw new Error("INVALID_ID");
  let next = query;
  keys.forEach((key, index) => { next = next.eq(key, values[index]); });
  return next;
}

function resourceActions(resource: AdminResource) {
  if (resource.key === "app-settings") return ["update"];
  if (resource.guided === "users") return ["create", "update", "suspend", "reactivate", "reset-password", "delete"];
  if (resource.guided === "launcher-device") return ["revoke"];
  if (resource.guided === "launcher-pairing") return ["cancel"];
  if (resource.guided === "calendar") return ["disconnect"];
  if (resource.readOnly) return sensitiveColumns(resource).length ? ["reveal"] : [];
  const actions = ["create", "update", "delete"];
  if (sensitiveColumns(resource).length) actions.push("reveal");
  if (resource.key === "organizations") actions.push("transfer-owner", "regenerate-code");
  return actions;
}

function assertOperation(resource: AdminResource, operation: AdminOperation) {
  if (!resourceActions(resource).includes(operation.kind)) throw new Error("ACTION_NOT_ALLOWED");
  const reason = String(operation.reason || "").trim();
  if (reason.length < 3 || reason.length > 500) throw new Error("REASON_REQUIRED");
  operation.reason = reason;

  const ids = normalizeIds(operation.ids);
  if (operation.kind !== "create" && ids.length === 0) throw new Error("TARGET_REQUIRED");
  if (ids.length > MAX_BULK) throw new Error("BULK_LIMIT");
  if (ids.length > 1 && (resource.guided || resource.key === "organizations" || resource.key === "app-settings")) {
    throw new Error("BULK_ACTION_NOT_ALLOWED");
  }
  if (ids.length > 1 && ["reveal", "suspend", "reactivate", "reset-password", "transfer-owner", "regenerate-code", "revoke", "cancel", "disconnect"].includes(operation.kind)) {
    throw new Error("BULK_ACTION_NOT_ALLOWED");
  }
  operation.ids = ids;

  if (operation.kind === "reveal") {
    const allowed = new Set(sensitiveColumns(resource));
    const requested = Array.isArray(operation.revealFields) ? operation.revealFields.map(String) : [];
    if (!requested.length || requested.some((field) => !allowed.has(field))) throw new Error("INVALID_REVEAL_FIELDS");
    operation.revealFields = [...new Set(requested)];
    operation.values = undefined;
    return;
  }

  const creating = operation.kind === "create";
  const allowed = new Set(editableColumns(resource, creating));
  if (operation.kind === "reset-password") allowed.add("temporary_password");
  if (operation.kind === "transfer-owner") allowed.add("owner_id");
  const values = operation.values && typeof operation.values === "object" ? operation.values : {};
  if (["create", "update", "reset-password", "transfer-owner"].includes(operation.kind)) {
    const names = Object.keys(values);
    if (!names.length || names.some((name) => !allowed.has(name))) throw new Error("INVALID_FIELDS");
  }
  if (creating) {
    for (const field of resource.fields.filter((item) => item.create && item.required)) {
      if (values[field.name] === undefined || values[field.name] === null || String(values[field.name]).trim() === "") throw new Error(`REQUIRED_${field.name}`);
    }
  }
  const temporaryPassword = values.temporary_password;
  if ((creating && resource.key === "users") || operation.kind === "reset-password") {
    if (typeof temporaryPassword !== "string" || temporaryPassword.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  }
  operation.values = values;
}

function normalizedValues(resource: AdminResource, values: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    const field = resource.fields.find((item) => item.name === name);
    if (!field) continue;
    if (value === "" && !field.required && field.type !== "text" && field.type !== "textarea") {
      result[name] = null;
    } else if (field.type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`INVALID_${name}`);
      result[name] = number;
    } else if (field.type === "boolean") {
      result[name] = value === true || value === "true";
    } else if (field.type === "json" && typeof value === "string") {
      try { result[name] = JSON.parse(value); } catch { throw new Error(`INVALID_${name}`); }
    } else {
      result[name] = value;
    }
  }
  return result;
}

function sanitizeAudit(resource: AdminResource, value: unknown): any {
  if (Array.isArray(value)) return value.map((item) => sanitizeAudit(resource, item));
  if (!value || typeof value !== "object") return value;
  const sensitive = new Set([...sensitiveColumns(resource), "temporary_password"]);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    sensitive.has(key) || AUDIT_REDACT.test(key) ? "[REDACTED]" : sanitizeAudit(resource, item),
  ]));
}

async function fetchRows(service: any, resource: AdminResource, ids: string[], includeSensitive: boolean) {
  if (resource.key === "users") {
    return Promise.all(ids.map(async (id) => {
      const [{ data: profile }, { data: authData, error: authError }] = await Promise.all([
        service.from("profiles").select("id,email,display_name,org_id,role,app_admin,created_at,updated_at").eq("id", id).maybeSingle(),
        service.auth.admin.getUserById(id),
      ]);
      if (authError || !authData?.user) throw new Error("TARGET_NOT_FOUND");
      const user = authData.user;
      return addAdminId(resource, {
        ...(profile || { id, email: user.email }),
        email: user.email || profile?.email || null,
        email_confirmed_at: user.email_confirmed_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        banned_until: user.banned_until || null,
        force_password_change: user.app_metadata?.force_password_change === true,
      });
    }));
  }
  const columns = selectedColumns(resource, includeSensitive).join(",");
  const rows: Record<string, any>[] = [];
  for (const id of ids) {
    const query = applyId(service.from(resource.table).select(columns), resource, id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("TARGET_NOT_FOUND");
    rows.push(addAdminId(resource, data));
  }
  return rows;
}

async function listUsers(service: any, resource: AdminResource, page: number, pageSize: number, search: string, sort: string, ascending: boolean, filters: Record<string, unknown>) {
  let query = service.from("profiles").select("id,email,display_name,org_id,role,app_admin,created_at,updated_at", { count: "exact" });
  if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  for (const [key, value] of Object.entries(filters)) query = value === null ? query.is(key, null) : query.eq(key, value);
  query = query.order(sort, { ascending }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const rows = await Promise.all((data || []).map(async (profile: any) => {
    const { data: authData } = await service.auth.admin.getUserById(profile.id);
    const user = authData?.user;
    return addAdminId(resource, {
      ...profile,
      email: user?.email || profile.email || null,
      email_confirmed_at: user?.email_confirmed_at || null,
      last_sign_in_at: user?.last_sign_in_at || null,
      banned_until: user?.banned_until || null,
      force_password_change: user?.app_metadata?.force_password_change === true,
    });
  }));
  return { rows, total: count || 0 };
}

async function countTable(service: any, table: string, filter?: [string, string]) {
  let query = service.from(table).select("*", { count: "exact", head: true });
  if (filter) query = query.eq(filter[0], filter[1]);
  const { count, error } = await query;
  return error ? 0 : (count || 0);
}

async function overview(service: any) {
  const [users, organizations, projects, pastes, quickPastes, secrets, devices, pairings, calendars, audits] = await Promise.all([
    countTable(service, "profiles"), countTable(service, "organizations"), countTable(service, "projects"),
    countTable(service, "pastes"), countTable(service, "quick_pastes"), countTable(service, "secrets"),
    countTable(service, "launcher_devices"), countTable(service, "launcher_pairing_requests", ["status", "waiting"]),
    countTable(service, "google_calendar_connections"), countTable(service, "admin_audit_log"),
  ]);
  const { data: recent } = await service.from("admin_audit_log")
    .select("id,actor_email,action,resource,target_ids,reason,status,created_at")
    .order("created_at", { ascending: false }).limit(8);
  return { metrics: { users, organizations, projects, content: pastes + quickPastes + secrets, devices, pendingPairings: pairings, calendars, audits }, recentAudit: recent || [], resources: ADMIN_RESOURCE_LIST };
}

async function impactPreview(service: any, resource: AdminResource, operation: AdminOperation) {
  const counts: Record<string, number> = {};
  const id = operation.ids?.[0];
  if (operation.kind === "delete" && id && resource.key === "organizations") {
    for (const [label, table] of [["users", "profiles"], ["projects", "projects"], ["quick links", "quicklinks"], ["pastes", "pastes"]] as const) counts[label] = await countTable(service, table, ["org_id", id]);
  }
  if (operation.kind === "delete" && id && resource.key === "projects") {
    for (const [label, table] of [["cards", "project_board_cards"], ["steps", "project_planner_steps"], ["resources", "project_resources"], ["files", "project_files"]] as const) counts[label] = await countTable(service, table, ["project_id", id]);
  }
  if (operation.kind === "delete" && id && resource.key === "users") {
    for (const [label, table] of [["projects", "projects"], ["quick pastes", "quick_pastes"], ["todos", "dashboard_todos"], ["classes", "classdash_classes"]] as const) counts[label] = await countTable(service, table, [table === "projects" ? "user_id" : "user_id", id]);
  }
  return counts;
}

async function guardUserOperation(service: any, actorId: string, operation: AdminOperation) {
  const id = operation.ids?.[0];
  if (!id) return;
  const lockingAction = ["delete", "suspend"].includes(operation.kind)
    || (operation.kind === "update" && operation.values?.app_admin === false);
  if (lockingAction && id === actorId) throw new Error("SELF_LOCKOUT_BLOCKED");
  if (lockingAction) {
    const { data: target } = await service.from("profiles").select("app_admin").eq("id", id).maybeSingle();
    if (target?.app_admin) {
      const { count } = await service.from("profiles").select("id", { count: "exact", head: true }).eq("app_admin", true);
      if ((count || 0) <= 1) throw new Error("LAST_ADMIN_BLOCKED");
    }
  }
}

async function executeUser(service: any, operation: AdminOperation) {
  const values = operation.values || {};
  const id = operation.ids?.[0];
  if (operation.kind === "create") {
    const email = String(values.email || "").trim();
    const password = String(values.temporary_password || "");
    const { data, error } = await service.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: values.display_name || email.split("@")[0] },
      app_metadata: { force_password_change: true },
    });
    if (error || !data.user) throw error || new Error("USER_CREATE_FAILED");
    const userId = data.user.id;
    const profile = {
      id: userId, email, display_name: values.display_name || email.split("@")[0],
      org_id: values.org_id || null, role: values.role || "member", app_admin: values.app_admin === true,
    };
    const { error: profileError } = await service.from("profiles").upsert(profile);
    if (profileError) {
      await service.auth.admin.deleteUser(userId).catch(() => undefined);
      throw profileError;
    }
    return { id: userId, email, force_password_change: true };
  }
  if (!id) throw new Error("TARGET_REQUIRED");
  if (operation.kind === "suspend") {
    const { error } = await service.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    if (error) throw error;
    return { id, suspended: true };
  }
  if (operation.kind === "reactivate") {
    const { error } = await service.auth.admin.updateUserById(id, { ban_duration: "none" });
    if (error) throw error;
    return { id, suspended: false };
  }
  if (operation.kind === "reset-password") {
    const { data: current, error: lookupError } = await service.auth.admin.getUserById(id);
    if (lookupError || !current.user) throw lookupError || new Error("TARGET_NOT_FOUND");
    const { error } = await service.auth.admin.updateUserById(id, {
      password: String(values.temporary_password || ""),
      app_metadata: { ...(current.user.app_metadata || {}), force_password_change: true },
    });
    if (error) throw error;
    return { id, force_password_change: true };
  }
  if (operation.kind === "delete") {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) throw error;
    return { id, deleted: true };
  }
  if (operation.kind === "update") {
    const normalized = normalizedValues(ADMIN_RESOURCES.users, values);
    const authPatch: Record<string, unknown> = {};
    if (normalized.email !== undefined) authPatch.email = normalized.email;
    if (Object.keys(authPatch).length) {
      const { error } = await service.auth.admin.updateUserById(id, authPatch);
      if (error) throw error;
    }
    const profilePatch = Object.fromEntries(Object.entries(normalized).filter(([key]) => ["email", "display_name", "org_id", "role", "app_admin"].includes(key)));
    const { data, error } = await service.from("profiles").update(profilePatch).eq("id", id).select("id,email,display_name,org_id,role,app_admin,created_at,updated_at").single();
    if (error) throw error;
    return data;
  }
  throw new Error("ACTION_NOT_ALLOWED");
}

async function executeNormal(service: any, resource: AdminResource, operation: AdminOperation) {
  const values = normalizedValues(resource, operation.values || {});
  if (operation.kind === "create") {
    if (resource.key === "organizations") {
      let code = "";
      for (let tries = 0; tries < 20; tries += 1) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        const { data: existing } = await service.from("organizations").select("id").eq("code", code).maybeSingle();
        if (!existing) break;
      }
      values.code = code;
    }
    const { data, error } = await service.from(resource.table).insert(values).select(selectedColumns(resource, false).join(",")).single();
    if (error) throw error;
    if (resource.key === "organizations") {
      const { error: ownerError } = await service.from("profiles").update({ org_id: data.id, role: "owner" }).eq("id", values.owner_id).select("id").single();
      if (ownerError) {
        await service.from("organizations").delete().eq("id", data.id);
        throw ownerError;
      }
    }
    return addAdminId(resource, data);
  }
  const id = operation.ids?.[0];
  if (!id) throw new Error("TARGET_REQUIRED");
  if (operation.kind === "reveal") {
    const columns = [resource.primaryKey.split(","), operation.revealFields || []].flat().join(",");
    const { data, error } = await applyId(service.from(resource.table).select(columns), resource, id).maybeSingle();
    if (error || !data) throw error || new Error("TARGET_NOT_FOUND");
    return addAdminId(resource, data);
  }
  if (operation.kind === "regenerate-code" && resource.key === "organizations") {
    let code = "";
    for (let tries = 0; tries < 20; tries += 1) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data } = await service.from("organizations").select("id").eq("code", code).maybeSingle();
      if (!data) break;
    }
    const { data, error } = await service.from("organizations").update({ code }).eq("id", id).select("id,name,owner_id,created_at").single();
    if (error) throw error;
    return data;
  }
  if (operation.kind === "transfer-owner" && resource.key === "organizations") {
    const ownerId = String(values.owner_id || "");
    const { data: nextOwner, error: memberError } = await service.from("profiles").select("id,org_id").eq("id", ownerId).single();
    if (memberError || nextOwner?.org_id !== id) throw new Error("OWNER_MUST_BE_MEMBER");
    const { error: updateError } = await service.rpc("admin_transfer_organization_owner", {
      p_organization_id: id,
      p_new_owner_id: ownerId,
    });
    if (updateError) throw updateError;
    return { id, owner_id: ownerId };
  }
  if (operation.kind === "revoke" && resource.guided === "launcher-device") {
    const { error } = await service.from(resource.table).delete().eq("id", id);
    if (error) throw error;
    return { id, revoked: true };
  }
  if (operation.kind === "cancel" && resource.guided === "launcher-pairing") {
    const { data, error } = await service.from(resource.table).update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).in("status", ["waiting", "approved"]).select("id,status").maybeSingle();
    if (error || !data) throw error || new Error("PAIRING_NOT_CANCELLABLE");
    return data;
  }
  if (operation.kind === "disconnect" && resource.guided === "calendar") {
    const { error } = await service.from(resource.table).delete().eq("owner_id", id);
    if (error) throw error;
    return { owner_id: id, disconnected: true };
  }
  if (operation.kind === "update") {
    if (resource.fields.some((field) => field.name === "updated_at")) values.updated_at = new Date().toISOString();
    let query = service.from(resource.table).update(values);
    if ((operation.ids || []).length > 1 && !resource.primaryKey.includes(",")) query = query.in(resource.primaryKey, operation.ids);
    else query = applyId(query, resource, id);
    const { data, error } = await query.select(selectedColumns(resource, false).join(","));
    if (error) throw error;
    return (data || []).map((row: any) => addAdminId(resource, row));
  }
  if (operation.kind === "delete") {
    let query = service.from(resource.table).delete();
    if ((operation.ids || []).length > 1 && !resource.primaryKey.includes(",")) query = query.in(resource.primaryKey, operation.ids);
    else query = applyId(query, resource, id);
    const { error } = await query;
    if (error) throw error;
    return { ids: operation.ids, deleted: true };
  }
  throw new Error("ACTION_NOT_ALLOWED");
}

function statusForError(error: any) {
  const code = String(error?.message || error?.code || "");
  if (/REASON_REQUIRED|REQUIRED_|INVALID_|PASSWORD_TOO_SHORT|TARGET_REQUIRED|BULK_/.test(code)) return 400;
  if (/SELF_LOCKOUT|LAST_ADMIN|OWNER_MUST|ACTION_NOT_ALLOWED/.test(code)) return 409;
  if (/TARGET_NOT_FOUND/.test(code)) return 404;
  return 500;
}

export default async function handler(req: any, res: any) {
  try {
    const access = await requireAdminAccess(req);
    if (access.ok === false) return res.status(access.status).json({ error: access.error });
    const cfg = getSupabaseServiceConfig();
    if (cfg.ok === false) return res.status(503).json({ error: cfg.error });
    if (!tokenSecret()) return res.status(503).json({ error: "Admin operation signing is not configured." });
    const service = createClient(cfg.url, cfg.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (req.method === "GET") {
      const key = queryValue(req, "resource") || "overview";
      if (key === "overview") return res.status(200).json(await overview(service));
      const resource = ADMIN_RESOURCES[key];
      if (!resource) return res.status(404).json({ error: "Unknown admin resource" });
      const page = Math.max(1, Math.floor(Number(queryValue(req, "page")) || 1));
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(queryValue(req, "pageSize")) || 25)));
      const search = cleanSearch(queryValue(req, "search"));
      const sortInput = queryValue(req, "sort");
      const sort = resource.sortFields.includes(sortInput) ? sortInput : resource.defaultSort;
      const ascending = queryValue(req, "direction") === "asc";
      let filters: Record<string, unknown> = {};
      try { filters = JSON.parse(queryValue(req, "filters") || "{}"); } catch { filters = {}; }
      filters = Object.fromEntries(Object.entries(filters).filter(([name]) => resource.filterFields?.includes(name)));

      const requestedRecord = queryValue(req, "record");
      if (requestedRecord && SAFE_ID.test(requestedRecord)) {
        const rows = await fetchRows(service, resource, [requestedRecord], false);
        return res.status(200).json({ rows, total: 1, resource: resource.key, label: resource.label, fields: resource.fields, actions: resourceActions(resource), redactedFields: sensitiveColumns(resource), filterFields: resource.filterFields || [], page: 1, pageSize, sort, direction: ascending ? "asc" : "desc" });
      }

      const listed = resource.key === "users"
        ? await listUsers(service, resource, page, pageSize, search, sort, ascending, filters)
        : await (async () => {
          let query = service.from(resource.table).select(selectedColumns(resource, false).join(","), { count: "exact" });
          if (search && resource.searchFields.length) query = query.or(resource.searchFields.map((field) => `${field}.ilike.%${search}%`).join(","));
          for (const [name, value] of Object.entries(filters)) query = value === null ? query.is(name, null) : query.eq(name, value);
          query = query.order(sort, { ascending }).range((page - 1) * pageSize, page * pageSize - 1);
          const { data, error, count } = await query;
          if (error) throw error;
          return { rows: (data || []).map((row: any) => addAdminId(resource, row)), total: count || 0 };
        })();
      return res.status(200).json({ ...listed, resource: resource.key, label: resource.label, fields: resource.fields, actions: resourceActions(resource), redactedFields: sensitiveColumns(resource), filterFields: resource.filterFields || [], page, pageSize, sort, direction: ascending ? "asc" : "desc" });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = parseBody(req.body);
    const phase = body.phase;
    const operation = body.operation as AdminOperation;
    if (!operation || typeof operation !== "object") return res.status(400).json({ error: "Operation is required" });
    const resource = ADMIN_RESOURCES[String(operation.resource || "")];
    if (!resource) return res.status(404).json({ error: "Unknown admin resource" });
    assertOperation(resource, operation);
    if (resource.key === "users") await guardUserOperation(service, access.userId, operation);
    const beforeRows = operation.kind === "create" ? [] : await fetchRows(service, resource, operation.ids || [], true);
    const fingerprint = sha(beforeRows);
    const digest = sha(operation);

    if (phase === "prepare") {
      const operationId = randomUUID();
      const destructive = ["delete", "revoke", "disconnect"].includes(operation.kind);
      const confirmation = destructive ? `DELETE ${operation.ids?.length || 1} ${resource.key}` : "CONFIRM";
      const impact = await impactPreview(service, resource, operation);
      const payload: TokenPayload = { v: 1, actor: access.userId, operationId, digest, fingerprint, confirmation, exp: Math.floor(Date.now() / 1000) + TOKEN_SECONDS };
      return res.status(200).json({
        operationToken: signPayload(payload), expiresAt: new Date(payload.exp * 1000).toISOString(), confirmation,
        preview: { action: operation.kind, resource: resource.label, count: operation.kind === "create" ? 1 : beforeRows.length, targets: sanitizeAudit(resource, beforeRows), changes: Object.keys(operation.values || {}), impact },
      });
    }

    if (phase !== "execute") return res.status(400).json({ error: "phase must be prepare or execute" });
    const payload = readToken(body.operationToken);
    if (!payload || payload.actor !== access.userId || payload.digest !== digest || payload.exp < Math.floor(Date.now() / 1000)) return res.status(409).json({ error: "Operation confirmation expired or changed. Prepare it again." });
    if (payload.fingerprint !== fingerprint) return res.status(409).json({ error: "The record changed after confirmation. Review it again." });
    if (String(body.confirmation || "") !== payload.confirmation) return res.status(400).json({ error: `Confirmation must be ${payload.confirmation}` });

    const auditInsert = {
      operation_id: payload.operationId, actor_id: access.userId, actor_email: access.email,
      action: operation.kind, resource: resource.key, target_ids: operation.ids || [], reason: operation.reason,
      changed_fields: operation.kind === "reveal" ? operation.revealFields || [] : Object.keys(operation.values || {}),
      before_data: sanitizeAudit(resource, beforeRows), after_data: sanitizeAudit(resource, operation.values || {}), status: "pending",
    };
    const { data: audit, error: auditError } = await service.from("admin_audit_log").insert(auditInsert).select("id").single();
    if (auditError) {
      if (auditError.code === "23505") return res.status(409).json({ error: "This confirmed operation was already used." });
      return res.status(503).json({ error: "Audit logging is unavailable; no action was performed." });
    }

    try {
      const result = resource.key === "users" ? await executeUser(service, operation) : await executeNormal(service, resource, operation);
      const resultRecord = result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : null;
      const resultId = resultRecord?._admin_id || resultRecord?.id || resultRecord?.owner_id;
      await service.from("admin_audit_log").update({
        status: "succeeded",
        target_ids: operation.ids?.length ? operation.ids : (resultId ? [String(resultId)] : []),
        after_data: sanitizeAudit(resource, result),
        completed_at: new Date().toISOString(),
      }).eq("id", audit.id);
      return res.status(200).json({ ok: true, auditId: audit.id, result });
    } catch (error: any) {
      await service.from("admin_audit_log").update({ status: "failed", error_code: String(error?.code || error?.message || "EXECUTION_FAILED").slice(0, 100), completed_at: new Date().toISOString() }).eq("id", audit.id);
      throw error;
    }
  } catch (error: any) {
    const status = statusForError(error);
    console.error("admin data request failed", { code: String(error?.code || error?.message || "UNKNOWN").slice(0, 100) });
    return res.status(status).json({ error: status === 500 ? "Admin operation failed." : String(error?.message || error?.code || "Invalid request") });
  }
}
