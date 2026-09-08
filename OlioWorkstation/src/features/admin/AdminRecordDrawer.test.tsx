import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminRecordDrawer } from "./AdminRecordDrawer";

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
