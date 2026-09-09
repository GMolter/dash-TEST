import { describe, expect, it } from "vitest";
import { ADMIN_ACCOUNT_SCOPES, ADMIN_RESOURCE_LIST, ADMIN_RESOURCES, editableColumns, referenceTarget, selectedColumns, sensitiveColumns } from "./adminResources";

describe("admin resource registry", () => {
  it("routes account deletion through requests instead of direct deletion", () => {
    const users = ADMIN_RESOURCE_LIST.find((resource) => resource.key === "users");
    expect(users?.actions).toContain("request-delete");
    expect(users?.actions).not.toContain("delete");
    expect(ADMIN_RESOURCES["admin-access-requests"].fields.find((field) => field.name === "request_kind")?.options).toContain("account_deletion");
  });
  it("allows only curated operational resources", () => {
    expect(ADMIN_RESOURCES.users.guided).toBe("users");
    expect(ADMIN_RESOURCES.projects.fields.map((field) => field.name)).toContain("ai_plan_usage_count");
    expect(ADMIN_RESOURCES["audit-log"].readOnly).toBe(true);
    expect(ADMIN_RESOURCES).not.toHaveProperty("launcher-rate-limits");
    expect(ADMIN_RESOURCES).not.toHaveProperty("user-dashboard-layout-items");
    expect(ADMIN_RESOURCES).not.toHaveProperty("project-overview-pins");
  });

  it("omits sensitive plaintext from list projections", () => {
    for (const key of ["secrets", "pastes", "quick-pastes", "project-files", "triggers", "short-urls", "organizations"]) {
      const resource = ADMIN_RESOURCES[key];
      const sensitive = sensitiveColumns(resource);
      expect(sensitive.length).toBeGreaterThan(0);
      expect(selectedColumns(resource, false)).not.toEqual(expect.arrayContaining(sensitive));
      expect(selectedColumns(resource, true)).toEqual(expect.arrayContaining(sensitive));
    }
  });

  it("never exposes credential, hash, or ciphertext fields", () => {
    for (const resource of Object.values(ADMIN_RESOURCES)) {
      const names = resource.fields.map((field) => field.name);
      expect(names).not.toEqual(expect.arrayContaining([
        "credential_hash", "pairing_secret_hash", "approval_code_hash", "actor_hash",
        "token_ciphertext", "token_iv", "token_tag", "encrypted_password",
      ]));
    }
  });

  it("keeps guided system records out of generic editing", () => {
    for (const key of ["launcher-devices", "launcher-pairings", "audit-log", "project-activity"]) {
      const resource = ADMIN_RESOURCES[key];
      expect(resource.readOnly).toBe(true);
      expect(editableColumns(resource, false)).toHaveLength(0);
    }
    expect(ADMIN_RESOURCES).not.toHaveProperty("calendar-connections");
  });

  it("allows the low-risk organization join code reveal without an audit prompt", () => {
    const code = ADMIN_RESOURCES.organizations.fields.find((field) => field.name === "code");
    expect(code).toMatchObject({ sensitive: true, auditReveal: false });
  });

  it("maps relational IDs to navigable admin resources", () => {
    expect(referenceTarget("projects", "user_id")?.resource).toBe("users");
    expect(referenceTarget("projects", "org_id")?.resource).toBe("organizations");
    expect(referenceTarget("project-board-cards", "project_id")?.resource).toBe("projects");
    expect(referenceTarget("project-files", "parent_id")?.resource).toBe("project-files");
    expect(referenceTarget("projects", "id")).toBeNull();
  });

  it("advertises ban and unban as user lifecycle actions", () => {
    const users = ADMIN_RESOURCE_LIST.find((resource) => resource.key === "users");
    expect(users?.actions).toEqual(expect.arrayContaining(["ban", "unban"]));
    expect(users?.actions).not.toEqual(expect.arrayContaining(["suspend", "reactivate"]));
  });

  it("uses an explicit allowlist for every account-management relationship", () => {
    expect(ADMIN_ACCOUNT_SCOPES.users).toBe("self");
    expect(ADMIN_ACCOUNT_SCOPES.quicklinks).toBe("user");
    expect(ADMIN_ACCOUNT_SCOPES.projects).toBe("user");
    expect(ADMIN_ACCOUNT_SCOPES["project-files"]).toBe("project-related");
    expect(ADMIN_ACCOUNT_SCOPES["launcher-devices"]).toBe("owner");
    expect(ADMIN_ACCOUNT_SCOPES).not.toHaveProperty("app-settings");
    expect(ADMIN_ACCOUNT_SCOPES).not.toHaveProperty("secrets");
    expect(ADMIN_ACCOUNT_SCOPES).not.toHaveProperty("triggers");
    for (const key of Object.keys(ADMIN_ACCOUNT_SCOPES)) expect(ADMIN_RESOURCES).toHaveProperty(key);
  });
});
