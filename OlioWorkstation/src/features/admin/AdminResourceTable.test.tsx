import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminResourceTable } from "./AdminResourceTable";

describe("AdminResourceTable entity references", () => {
  it("replaces admin status with app activity colors while preserving the admin filter", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 21, 12));
    try {
      const user = userEvent.setup();
      const onFilters = vi.fn();
      const rows = [0, 1, 2, 3, 5, 6, 7].map((days) => ({
        _admin_id: String(days), display_name: `User ${days}`, app_admin: true,
        org_id: "org-1", _admin_refs: { org_id: { id: "org-1", label: "Example organization", resource: "organizations" } },
        last_active_at: new Date(2026, 8, 21 - days, 12).toISOString(),
      }));
      render(<AdminResourceTable data={{ resource: "users", label: "Users",
        rows: [...rows, { _admin_id: "never", display_name: "New user", app_admin: false, last_active_at: "" }], total: 8,
        fields: [
          { name: "display_name", label: "Display name", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "role", label: "Organization role", type: "text" },
          { name: "app_admin", label: "App admin", type: "boolean" },
          { name: "last_active_at", label: "Last sign in", type: "datetime" },
          { name: "org_id", label: "Organization", type: "text" },
        ], actions: [], redactedFields: [], filterFields: ["app_admin"], sortFields: [], page: 1, pageSize: 25, sort: "created_at", direction: "desc",
      }} loading={false} search="" filters={{}} selected={new Set()} onSearch={vi.fn()} onFilters={onFilters} onSelection={vi.fn()} onOpen={vi.fn()} onOpenReference={vi.fn()} onCreate={vi.fn()} onPage={vi.fn()} onSort={vi.fn()} onBulkDelete={vi.fn()} onBulkUpdate={vi.fn()} />);
      expect(screen.getByRole("columnheader", { name: "Last Active" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Last Session" })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: "Organization" })).not.toBeInTheDocument();
      expect(screen.queryByText("Example organization")).not.toBeInTheDocument();
      expect(screen.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "long" }).format(new Date(rows[0].last_active_at)))).toBeVisible();
      expect(screen.queryByRole("columnheader", { name: "App admin" })).not.toBeInTheDocument();
      for (const label of ["Today", "1 Day Ago", "2 Days Ago"]) expect(screen.getByText(label)).toHaveClass("bg-emerald-400/15");
      for (const label of ["3 Days Ago", "5 Days Ago", "6 Days Ago"]) expect(screen.getByText(label)).toHaveClass("bg-orange-400/15");
      expect(screen.getByText("7 Days Ago")).toHaveClass("bg-red-400/15");
      expect(screen.getAllByText("Not yet tracked")).toHaveLength(2);
      await user.click(screen.getByRole("button", { name: "Filter" }));
      await user.selectOptions(screen.getByLabelText("Filter field"), "app_admin");
      await user.selectOptions(screen.getByLabelText("Filter value"), "true");
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(onFilters).toHaveBeenCalledWith({ app_admin: true });
    } finally { vi.useRealTimers(); }
  });

  it("offers every declared status and resets the value when changing fields", async () => {
    const user = userEvent.setup();
    const onFilters = vi.fn();
    render(<AdminResourceTable data={{ resource: "admin-access-requests", label: "Pending reviews", rows: [], total: 0,
      fields: [{ name: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected"] }, { name: "enabled", label: "Enabled", type: "boolean" }],
      actions: [], redactedFields: [], filterFields: ["status", "enabled"], sortFields: [], page: 1, pageSize: 25, sort: "status", direction: "asc",
    }} loading={false} search="" filters={{}} selected={new Set()} onSearch={vi.fn()} onFilters={onFilters} onSelection={vi.fn()} onOpen={vi.fn()} onOpenReference={vi.fn()} onCreate={vi.fn()} onPage={vi.fn()} onSort={vi.fn()} onBulkDelete={vi.fn()} onBulkUpdate={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.selectOptions(screen.getByLabelText("Filter field"), "status");
    expect(screen.getByRole("option", { name: "Approved" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filter value"), "pending");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onFilters).toHaveBeenCalledWith({ status: "pending" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.selectOptions(screen.getByLabelText("Filter value"), "approved");
    await user.selectOptions(screen.getByLabelText("Filter field"), "enabled");
    expect(screen.getByLabelText("Filter value")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Filter value"), "false");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onFilters).toHaveBeenCalledWith({ enabled: false });
  });
  it("shows a readable linked name instead of a foreign-key string", async () => {
    const user = userEvent.setup();
    const onOpenReference = vi.fn();
    render(<AdminResourceTable
      data={{
        resource: "projects",
        label: "Projects",
        rows: [{
          _admin_id: "project-1",
          id: "project-1",
          name: "Launch plan",
          user_id: "9da1974c-random-id",
          _admin_refs: { user_id: { id: "9da1974c-random-id", label: "Avery Stone · avery@example.com", resource: "users" } },
        }],
        total: 1,
        fields: [
          { name: "id", label: "ID", type: "text" },
          { name: "name", label: "Name", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "user_id", label: "User", type: "text" },
        ],
        actions: ["update"],
        redactedFields: [],
        filterFields: [],
        sortFields: ["name"],
        page: 1,
        pageSize: 25,
        sort: "name",
        direction: "asc",
      }}
      loading={false}
      search=""
      filters={{}}
      selected={new Set()}
      onSearch={vi.fn()}
      onFilters={vi.fn()}
      onSelection={vi.fn()}
      onOpen={vi.fn()}
      onOpenReference={onOpenReference}
      onCreate={vi.fn()}
      onPage={vi.fn()}
      onSort={vi.fn()}
      onBulkDelete={vi.fn()}
      onBulkUpdate={vi.fn()}
    />);

    expect(screen.queryByText("9da1974c-random-id")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Avery Stone/ }));
    expect(onOpenReference).toHaveBeenCalledWith({ id: "9da1974c-random-id", label: "Avery Stone · avery@example.com", resource: "users" });
  });
});
