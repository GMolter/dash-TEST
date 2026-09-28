import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminBannerPage } from "./AdminBannerPage";
import { loadAdminResource } from "./api";
import type { AdminListResponse } from "./types";

vi.mock("./api", () => ({ loadAdminResource: vi.fn() }));
vi.mock("./AdminOperationDialog", () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadAdminResource).mockResolvedValue({ rows: [{ _admin_id: "global", banner_enabled: true, banner_text: "Hello" }] } as AdminListResponse);
});

it("inserts links and saves the schedule as UTC through the audited operation", async () => {
  const actor = userEvent.setup();
  render(<AdminBannerPage />);
  const message = await screen.findByLabelText("Banner message");
  (message as HTMLTextAreaElement).setSelectionRange(0, 5);
  await actor.click(screen.getByRole("button", { name: "Insert link" }));
  await actor.type(screen.getByLabelText("Link URL"), "https://example.com");
  await actor.click(screen.getByRole("button", { name: "Add link" }));
  expect(message).toHaveValue("[Hello](https://example.com/)");
  fireEvent.change(screen.getByLabelText("Start time (optional)"), { target: { value: "2026-10-01T12:00" } });
  fireEvent.change(screen.getByLabelText("End time (optional)"), { target: { value: "2026-10-01T11:00" } });
  expect(screen.getByRole("button", { name: "Save banner" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("End time (optional)"), { target: { value: "2026-10-01T13:00" } });
  await actor.click(screen.getByRole("button", { name: "Save banner" }));
  const operation = JSON.parse(screen.getByTestId("operation").textContent!);
  expect(operation).toMatchObject({ resource: "app-settings", kind: "update", ids: ["global"], values: { banner_text: "[Hello](https://example.com/)", banner_starts_at: new Date("2026-10-01T12:00").toISOString(), banner_ends_at: new Date("2026-10-01T13:00").toISOString() } });
});

it("prevents saving empty enabled messages and reports load failures", async () => {
  const actor = userEvent.setup();
  const { unmount } = render(<AdminBannerPage />);
  await actor.clear(await screen.findByLabelText("Banner message"));
  expect(screen.getByRole("button", { name: "Save banner" })).toBeDisabled();
  await actor.click(screen.getByLabelText(/Enable banner/));
  expect(screen.getByRole("button", { name: "Save banner" })).toBeEnabled();
  unmount();
  vi.mocked(loadAdminResource).mockRejectedValue(new Error("Unable to load settings"));
  render(<AdminBannerPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load settings");
  expect(screen.queryByRole("button", { name: "Save banner" })).not.toBeInTheDocument();
});
