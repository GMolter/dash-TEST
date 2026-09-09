import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminUserAccountPage } from "./AdminUserAccountPage";

describe("AdminUserAccountPage", () => {
  it("shows the complete account summary and opens related data by name", async () => {
    const user = userEvent.setup();
    const onSelectResource = vi.fn();
    const onAccountOperation = vi.fn();
    render(<AdminUserAccountPage
      overview={{
        user: {
          _admin_id: "9da1974c-83ec-4b93-8762-976bc8638fc1",
          display_name: "Avery Stone",
          email: "avery@example.com",
          role: "member",
          org_id: "org-1",
          _admin_refs: { org_id: { id: "org-1", resource: "organizations", label: "Example organization" } },
          app_admin: false,
          force_password_change: true,
          created_at: "2026-09-08T14:30:00.000Z",
        },
        userFields: [
          { name: "id", label: "User ID", type: "text" },
          { name: "display_name", label: "Display name", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "role", label: "Organization role", type: "select" },
          { name: "created_at", label: "Created", type: "datetime" },
        ],
        canManage: true,
        userActions: ["update", "ban", "reset-password", "request-admin", "remove-organization"],
        totalRecords: 5,
        resources: [
          { key: "projects", label: "Projects", group: "projects", total: 2, unavailable: false },
          { key: "quicklinks", label: "Quick links", group: "utilities", total: 2, unavailable: false },
          { key: "quick-pastes", label: "Quick Pastes", group: "content", total: 0, unavailable: false },
        ],
      }}
      loading={false}
      error={null}
      selectedResource=""
      onBack={vi.fn()}
      onAccountOperation={onAccountOperation}
      onOpenReference={vi.fn()}
      onSelectResource={onSelectResource}
    />);

    expect(screen.getByRole("heading", { name: "Avery Stone" })).toBeInTheDocument();
    expect(screen.getByText("Password change required")).toBeInTheDocument();
    expect(screen.getByText("4 records")).toBeInTheDocument();
    expect(screen.queryByText("Quick Pastes")).not.toBeInTheDocument();
    await user.click(screen.getByText("Membership actions"));
    await user.click(screen.getByRole("button", { name: "Review membership removal" }));
    expect(onAccountOperation).toHaveBeenCalledWith("remove-organization");
    await user.click(screen.getByRole("button", { name: /Quick links/ }));
    expect(onSelectResource).toHaveBeenCalledWith("quicklinks");
    await user.click(screen.getByRole("button", { name: /Edit account and access/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit account and access" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Request administrator access" }));
    expect(onAccountOperation).toHaveBeenCalledWith("request-admin");
    await user.clear(screen.getByLabelText(/Display name/));
    await user.type(screen.getByLabelText(/Display name/), "Gavin Smith");
    await user.click(screen.getByRole("button", { name: "Review changes" }));
    expect(onAccountOperation).toHaveBeenCalledWith("update", { display_name: "Gavin Smith" });
    expect(onAccountOperation.mock.calls[onAccountOperation.mock.calls.length - 1][1]).not.toHaveProperty("app_admin");
    expect(screen.queryByRole("button", { name: "Remove organization" })).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Search organization by name…"));
    expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
  });
});
