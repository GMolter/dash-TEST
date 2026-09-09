import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOperationDialog } from "./AdminOperationDialog";
import { executeAdminOperation, prepareAdminOperation } from "./api";

vi.mock("./api", () => ({
  prepareAdminOperation: vi.fn(),
  executeAdminOperation: vi.fn(),
}));

describe("AdminOperationDialog", () => {
  beforeEach(() => {
    vi.mocked(prepareAdminOperation).mockResolvedValue({
      operationToken: "signed-token",
      expiresAt: "2026-09-08T12:05:00.000Z",
      confirmation: "DELETE 1 projects",
      preview: { action: "delete", resource: "Projects", count: 1, targets: [], changes: [], impact: { cards: 3 } },
    });
    vi.mocked(executeAdminOperation).mockResolvedValue({ result: { deleted: true } });
  });

  it("submits the chosen ban duration with the reason", async () => {
    const user = userEvent.setup();
    render(<AdminOperationDialog operation={{ resource: "users", kind: "ban", ids: ["user-1"] }} title="Ban account" onCancel={vi.fn()} onComplete={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox"), "168h");
    await user.type(screen.getByLabelText("Reason for this action"), "Repeated harassment");
    await user.click(screen.getByRole("button", { name: "Review operation" }));
    expect(prepareAdminOperation).toHaveBeenCalledWith(expect.objectContaining({ kind: "ban", values: { ban_duration: "168h" }, reason: "Repeated harassment" }));
  });

  it("requires a reason, preview, and exact confirmation before execution", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<AdminOperationDialog
      operation={{ resource: "projects", kind: "delete", ids: ["project-a"] }}
      title="Delete Project" onCancel={vi.fn()} onComplete={onComplete} />);

    expect(screen.getByRole("button", { name: "Review operation" })).toBeDisabled();
    await user.type(screen.getByLabelText("Reason for this action"), "Duplicate test project");
    await user.click(screen.getByRole("button", { name: "Review operation" }));
    expect(await screen.findByText("Related records that may be affected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Execute" })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "DELETE 1 projects");
    await user.click(screen.getByRole("button", { name: "Execute" }));

    expect(prepareAdminOperation).toHaveBeenCalledWith(expect.objectContaining({ reason: "Duplicate test project" }));
    expect(executeAdminOperation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ operationToken: "signed-token" }), "DELETE 1 projects");
    expect(onComplete).toHaveBeenCalledWith({ deleted: true });
  });
});
