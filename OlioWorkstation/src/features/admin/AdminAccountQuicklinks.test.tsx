import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccountQuicklinks } from "./AdminAccountQuicklinks";
import { loadAdminResource } from "./api";
import type { AdminListResponse } from "./types";

vi.mock("./api", () => ({ loadAdminResource: vi.fn() }));
vi.mock("./AdminOperationDialog", () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));

const user = { _admin_id: "user-1", display_name: "Avery", org_id: "org-1", _admin_refs: { org_id: { id: "org-1", label: "Team", resource: "organizations" } } };
function response(resource: string): AdminListResponse {
  return { resource, label: resource === "quicklinks" ? "Quick links" : "Folders", rows: [], total: 0, page: 1, pageSize: 1, sort: "order_index", direction: "asc", actions: ["create", "update", "delete"], redactedFields: [], filterFields: [], sortFields: [], fields: [
    { name: "title", label: "Title", type: "text", create: true },
    { name: "user_id", label: "User", type: "text", create: true },
    { name: "org_id", label: "Organization", type: "text", create: true },
    { name: "folder_id", label: "Folder", type: "text", create: true },
    { name: "scope", label: "Scope", type: "select", create: true, options: ["personal", "shared", "both"] },
  ] };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadAdminResource).mockImplementation(async ({ resource, page }) => resource === "quicklink-folders" ? {
    ...response(resource), total: 1, rows: [{ _admin_id: "folder-1", name: "School", scope: "personal" }],
  } : { ...response(resource), page, total: 2, rows: page === 1 ? [{ _admin_id: "root", title: "Root link" }] : [{ _admin_id: "nested", title: "Course link", folder_id: "folder-1" }] });
});

describe("AdminAccountQuicklinks", () => {
  it("loads all pages, nests links and searches within collapsed folders", async () => {
    const actor = userEvent.setup();
    render(<AdminAccountQuicklinks user={user} onComplete={vi.fn()} onOpenReference={vi.fn()} />);
    await screen.findByText("Root link");
    expect(screen.queryByText("Course link")).not.toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "Expand School" }));
    expect(screen.getByText("Course link")).toBeInTheDocument();
    expect(loadAdminResource).toHaveBeenCalledWith(expect.objectContaining({ accountUserId: "user-1", resource: "quicklinks", page: 2 }));
    await actor.click(screen.getByRole("button", { name: "Collapse School" }));
    await actor.type(screen.getByRole("textbox", { name: "Search links and folders" }), "Course");
    expect(screen.getByText("Course link")).toBeInTheDocument();
    expect(screen.queryByText("Root link")).not.toBeInTheDocument();
  });

  it("prefills the selected account and folder in the reviewed creation", async () => {
    const actor = userEvent.setup();
    render(<AdminAccountQuicklinks user={user} onComplete={vi.fn()} onOpenReference={vi.fn()} />);
    await actor.click(await screen.findByRole("button", { name: "Add link to School" }));
    await waitFor(() => expect(screen.getByDisplayValue("Avery")).toBeInTheDocument());
    expect(screen.getByDisplayValue("School")).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "Review creation" }));
    expect(JSON.parse(screen.getByTestId("operation").textContent!)).toMatchObject({ resource: "quicklinks", kind: "create", values: { user_id: "user-1", org_id: "org-1", folder_id: "folder-1", scope: "personal" } });
  });

  it("reports load failures instead of showing an incomplete collection", async () => {
    vi.mocked(loadAdminResource).mockRejectedValue(new Error("Unavailable"));
    render(<AdminAccountQuicklinks user={user} onComplete={vi.fn()} onOpenReference={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable");
    expect(screen.queryByRole("button", { name: "Add folder" })).not.toBeInTheDocument();
  });

  it("creates a root link with no folder rather than an empty foreign key", async () => {
    const actor = userEvent.setup();
    render(<AdminAccountQuicklinks user={user} onComplete={vi.fn()} onOpenReference={vi.fn()} />);
    await actor.click(await screen.findByRole("button", { name: "Add quick link" }));
    await actor.click(screen.getByRole("button", { name: "Review creation" }));
    expect(JSON.parse(screen.getByTestId("operation").textContent!)).toMatchObject({ resource: "quicklinks", kind: "create", values: { user_id: "user-1", folder_id: null } });
  });
});
