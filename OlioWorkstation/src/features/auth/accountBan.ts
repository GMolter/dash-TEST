export type AccountBan = { user_id: string; banned_until: string; reason: string };

export function activeAccountBan(value: unknown, userId: string, now = Date.now()): AccountBan | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.user_id !== userId || typeof row.banned_until !== 'string' || Date.parse(row.banned_until) <= now || !Number.isFinite(Date.parse(row.banned_until))) return null;
  return { user_id: userId, banned_until: row.banned_until, reason: typeof row.reason === 'string' && row.reason.trim() ? row.reason : 'Account access has been suspended.' };
}
