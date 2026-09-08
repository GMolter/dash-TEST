import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminResourceTable } from "./AdminResourceTable";

describe("AdminResourceTable entity references", () => {
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
