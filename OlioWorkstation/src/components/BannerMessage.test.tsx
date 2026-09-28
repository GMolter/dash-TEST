import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BannerMessage } from "./BannerMessage";
import { bannerStatus, toLocalDateTime } from "../lib/banner";

describe("dashboard banners", () => {
  it("shows only during the scheduled window, including cached schedules", () => {
    const banner = { enabled: true, text: "Maintenance", startsAt: "2026-10-01T12:00:00Z", endsAt: "2026-10-01T13:00:00Z" };
    expect(bannerStatus(banner, Date.parse("2026-10-01T11:59:59Z"))).toBe("Scheduled");
    expect(bannerStatus(banner, Date.parse(banner.startsAt))).toBe("Live");
    expect(bannerStatus(banner, Date.parse(banner.endsAt))).toBe("Ended");
    expect(bannerStatus({ ...banner, enabled: false }, Date.parse(banner.startsAt))).toBe("Hidden");
    expect(bannerStatus({ enabled: true, text: "Now" })).toBe("Live");
    expect(bannerStatus({ enabled: true, text: "Now", startsAt: "invalid" })).toBe("Hidden");
    expect(bannerStatus({ enabled: true, text: "  " })).toBe("Hidden");
  });

  it("round-trips local schedule times to the same instant", () => {
    const instant = "2026-10-01T12:00:00.000Z";
    expect(new Date(toLocalDateTime(instant)).toISOString()).toBe(instant);
  });

  it("renders multiple safe links and keeps unsafe links and HTML inert", () => {
    const { container } = render(<BannerMessage text={'Read [details](https://example.com/details) or [status](http://status.example.com). [bad](javascript:alert) [data](data:text/html,test) <img src=x onerror=alert(1)>'} />);
    expect(screen.getByRole("link", { name: "details" })).toHaveAttribute("href", "https://example.com/details");
    expect(screen.getByRole("link", { name: "status" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("[bad](javascript:alert)");
  });
});
