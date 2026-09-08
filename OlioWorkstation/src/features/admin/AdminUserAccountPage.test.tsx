import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminUserAccountPage } from "./AdminUserAccountPage";

describe("AdminUserAccountPage", () => {
  it("shows the complete account summary and opens related data by name", async () => {
    const user = userEvent.setup();
    const onSelectResource = vi.fn();
    const onManageAccount = vi.fn();
    render(<AdminUserAccountPage
      overview={{
        user: {
          _admin_id: "9da1974c-83ec-4b93-8762-976bc8638fc1",
          display_name: "Avery Stone",
          email: "avery@example.com",
          role: "member",
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
        userActions: ["update", "ban", "reset-password"],
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
      onManageAccount={onManageAccount}
      onOpenReference={vi.fn()}
      onSelectResource={onSelectResource}
    />);

    expect(screen.getByRole("heading", { name: "Avery Stone" })).toBeInTheDocument();
    expect(screen.getByText("Password change required")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("Quick Pastes")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Quick links/ }));
    expect(onSelectResource).toHaveBeenCalledWith("quicklinks");
    await user.click(screen.getByRole("button", { name: /Edit account and access/ }));
    expect(onManageAccount).toHaveBeenCalledOnce();
  });
});
