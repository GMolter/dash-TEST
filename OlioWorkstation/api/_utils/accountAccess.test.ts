import { describe, expect, it } from 'vitest';
import { accountIsAllowed } from './accountAccess';

function client(banned_until: string | null, error: unknown = null) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { banned_until }, error }) }) }) }) };
}

describe('live ban enforcement for service endpoints', () => {
  it('blocks a banned account even when its token is otherwise valid', async () => {
    expect(await accountIsAllowed(client('2099-01-01T00:00:00Z'), 'user')).toBe(false);
  });
  it('allows expired bans and unbanned accounts', async () => {
    expect(await accountIsAllowed(client('2000-01-01T00:00:00Z'), 'user')).toBe(true);
    expect(await accountIsAllowed(client(null), 'user')).toBe(true);
  });
  it('fails closed when current ban state cannot be checked', async () => {
    expect(await accountIsAllowed(client(null, new Error('unavailable')), 'user')).toBe(false);
  });
});
