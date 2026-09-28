export type BannerState = { enabled: boolean; text: string; startsAt?: string | null; endsAt?: string | null };

export function bannerStatus(banner: BannerState, now = Date.now()) {
  if (!banner.enabled || !banner.text.trim()) return "Hidden";
  const start = banner.startsAt ? Date.parse(banner.startsAt) : null;
  const end = banner.endsAt ? Date.parse(banner.endsAt) : null;
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return "Hidden";
  if (end !== null && now >= end) return "Ended";
  if (start !== null && now < start) return "Scheduled";
  return "Live";
}

export function safeBannerUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
