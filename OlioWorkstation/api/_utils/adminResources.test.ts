import { describe, expect, it } from "vitest";
import { ADMIN_RESOURCES, editableColumns, referenceTarget, selectedColumns, sensitiveColumns } from "./adminResources";

describe("admin resource registry", () => {
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
    for (const key of ["launcher-devices", "launcher-pairings", "calendar-connections", "audit-log", "project-activity"]) {
      const resource = ADMIN_RESOURCES[key];
      expect(resource.readOnly).toBe(true);
      expect(editableColumns(resource, false)).toHaveLength(0);
    }
  });

  it("maps relational IDs to navigable admin resources", () => {
    expect(referenceTarget("projects", "user_id")?.resource).toBe("users");
    expect(referenceTarget("projects", "org_id")?.resource).toBe("organizations");
    expect(referenceTarget("project-board-cards", "project_id")?.resource).toBe("projects");
    expect(referenceTarget("project-files", "parent_id")?.resource).toBe("project-files");
    expect(referenceTarget("projects", "id")).toBeNull();
  });
});
