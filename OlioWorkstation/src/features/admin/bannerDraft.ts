export type BannerDraft = { title: string; color: string; message: string; start: string; end: string };
export const emptyBanner = (): BannerDraft => ({ title: 'Announcement', color: '#fbbf24', message: '', start: '', end: '' });
export const invalidBannerSchedule = ({ start, end }: BannerDraft) => Boolean((start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end))) || (start && end && Date.parse(end) <= Date.parse(start)));
export const bannerValues = (draft: BannerDraft) => ({ title: draft.title.trim(), color: draft.color, message: draft.message.trim(), starts_at: draft.start ? new Date(draft.start).toISOString() : null, ends_at: draft.end ? new Date(draft.end).toISOString() : null });
