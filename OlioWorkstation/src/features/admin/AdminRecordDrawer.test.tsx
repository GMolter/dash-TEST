import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminRecordDrawer } from "./AdminRecordDrawer";
import { ADMIN_RESOURCES, resourceActionsForCatalog } from '../../../api/_utils/adminResources';

const fields = [
  { name: "id", label: "User ID", type: "text" as const },
  { name: "display_name", label: "Display name", type: "text" as const },
  { name: "banned_until", label: "Banned until", type: "datetime" as const },
];

describe("AdminRecordDrawer account bans", () => {
  it("offers ban for an active account and unban for a banned account", async () => {
    const user = userEvent.setup();
    const onOperation = vi.fn();
    const common = {
      label: "Users",
      fields,
      actions: ["ban", "unban"],
      creating: false,
      revealed: {},
      onClose: vi.fn(),
      onReveal: vi.fn(),
      onOpenReference: vi.fn(),
      onOperation,
    };
    const { rerender } = render(<AdminRecordDrawer {...common} row={{ _admin_id: "user-1", id: "user-1", display_name: "Taylor", banned_until: null }} />);

    await user.click(screen.getByRole("button", { name: "Ban account" }));
    expect(onOperation).toHaveBeenCalledWith("ban");

    rerender(<AdminRecordDrawer {...common} row={{ _admin_id: "user-1", id: "user-1", display_name: "Taylor", banned_until: "2099-01-01T00:00:00.000Z" }} />);
    await user.click(screen.getByRole("button", { name: "Unban account" }));
    expect(onOperation).toHaveBeenCalledWith("unban");
  });
});

it('offers secret deletion without exposing content or allowing edits', async () => {
  const user = userEvent.setup();
  const onOperation = vi.fn();
  const secret = ADMIN_RESOURCES.secrets;
  const props = {
    label: secret.label, fields: secret.fields, actions: resourceActionsForCatalog(secret),
    row: { _admin_id: 'owner-secret', user_id: 'owner', viewed: false }, creating: false,
    revealed: {}, onClose: vi.fn(), onReveal: vi.fn(), onOpenReference: vi.fn(), onOperation,
  };
  const { rerender } = render(<AdminRecordDrawer {...props} />);
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
  expect(onOperation).toHaveBeenCalledWith('delete');

  // The console removes actions when an ordinary admin opens a protected row.
  rerender(<AdminRecordDrawer {...props} actions={[]} row={{ ...props.row, _admin_protected: true }} />);
  expect(screen.queryByRole('button', { name: 'Delete permanently' })).not.toBeInTheDocument();
});
