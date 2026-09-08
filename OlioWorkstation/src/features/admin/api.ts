import { supabase } from "../../lib/supabase";
import type { AdminListResponse, AdminOperation, AdminOverview, PreparedOperation } from "./types";

async function adminFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers || {});
  if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function loginAdmin(password: string) {
  return adminFetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function logoutAdmin() {
  return adminFetch("/api/admin/logout", { method: "POST" });
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  return adminFetch("/api/admin/data?resource=overview");
}

export async function loadAdminResource(input: {
  resource: string;
  page: number;
  pageSize: number;
  search: string;
  sort?: string;
  direction?: "asc" | "desc";
  filters?: Record<string, unknown>;
  recordId?: string;
}): Promise<AdminListResponse> {
  const params = new URLSearchParams({
    resource: input.resource,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.search) params.set("search", input.search);
  if (input.sort) params.set("sort", input.sort);
  if (input.direction) params.set("direction", input.direction);
  if (input.filters && Object.keys(input.filters).length) params.set("filters", JSON.stringify(input.filters));
  if (input.recordId) params.set("record", input.recordId);
  return adminFetch(`/api/admin/data?${params.toString()}`);
}

export async function prepareAdminOperation(operation: AdminOperation): Promise<PreparedOperation> {
  return adminFetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase: "prepare", operation }),
  });
}

export async function executeAdminOperation(operation: AdminOperation, prepared: PreparedOperation, confirmation: string) {
  return adminFetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase: "execute", operation, operationToken: prepared.operationToken, confirmation }),
  });
}

export async function revealAdminField(resource: string, id: string, field: string) {
  return adminFetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "reveal",
      operation: { resource, kind: "reveal", ids: [id], revealFields: [field] },
    }),
  });
}
