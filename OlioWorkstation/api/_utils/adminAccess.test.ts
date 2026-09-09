import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { requireAdminAccess } from "./adminAccess";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
}) }));

describe("account-based admin access", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_COOKIE_SECRET", "");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { app_admin: true, app_owner: true, email: "owner@example.com" }, error: null });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("allows an admin with a valid bearer token and no unlock key or cookie", async () => {
    expect(await requireAdminAccess({ headers: { authorization: "Bearer session" } })).toMatchObject({ ok: true, appOwner: true });
    expect(mocks.getUser).toHaveBeenCalledWith("session");
  });
  it("returns not found for non-admin accounts", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { app_admin: false }, error: null });
    expect(await requireAdminAccess({ headers: { authorization: "Bearer session" } })).toEqual({ ok: false, status: 404, error: "Not found" });
  });
  it("does not accept the old cookie without an account session", async () => {
    expect(await requireAdminAccess({ headers: { cookie: "admin_session=old-cookie" } })).toEqual({ ok: false, status: 404, error: "Not found" });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("returns not found for expired sessions", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    expect(await requireAdminAccess({ headers: { authorization: "Bearer expired" } })).toEqual({ ok: false, status: 404, error: "Not found" });
  });
});
