import { describe, expect, it } from "vitest";
import { resolveDashboardModules } from "./useDashboardConfiguration";

describe("dashboard plugin visibility", () => {
  it("keeps ClassDash off the dashboard when its installation disables the dashboard", () => {
    const modules = resolveDashboardModules([
      { user_id: "user-1", plugin_id: "classdash", dashboard_enabled: false, dashboard_order: 0 },
    ], [
      { user_id: "user-1", module_id: "classdash", enabled: true, order_index: 0, column_span: 12 },
    ]);

    expect(modules.find((module) => module.id === "classdash")).toMatchObject({
      available: true,
      enabled: false,
    });
  });

  it("shows ClassDash when both installation and module settings allow it", () => {
    const modules = resolveDashboardModules([
      { user_id: "user-1", plugin_id: "classdash", dashboard_enabled: true, dashboard_order: 0 },
    ], []);

    expect(modules.find((module) => module.id === "classdash")).toMatchObject({
      available: true,
      enabled: true,
    });
  });
});
