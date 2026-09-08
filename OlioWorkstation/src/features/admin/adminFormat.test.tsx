import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminDisplayValue, adminFieldLabel, formatAdminValue, humanizeAdminText } from "./adminFormat";

describe("admin display formatting", () => {
  it("turns database labels and statuses into readable text", () => {
    expect(humanizeAdminText("force_password_change")).toBe("Force Password Change");
    expect(formatAdminValue("pending_approval", "select", "status")).toBe("Pending Approval");
    expect(adminFieldLabel({ name: "owner_id", label: "Owner ID", type: "text" })).toBe("Owner");
  });

  it("formats timestamps instead of exposing raw ISO strings", () => {
    const formatted = formatAdminValue("2026-09-08T14:30:00.000Z", "datetime");
    expect(formatted).not.toContain("T14:30:00.000Z");
    expect(formatted).toContain("2026");
  });

  it("presents structured metadata as labeled fields", () => {
    render(<AdminDisplayValue value={{ last_seen_at: "2026-09-08T14:30:00.000Z", enabled: true }} />);
    expect(screen.getByText("Last Seen At")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
