import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createAuthRefreshFetch } from './authRefreshFetch';

const project = 'https://auth-test.supabase.co';
const refreshUrl = `${project}/auth/v1/token?grant_type=refresh_token`;
const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', ...headers },
});
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('refresh rate-limit recovery', () => {
  it('shares cooldown with a second tab and resumes after Retry-After', async () => {
    const transport = vi.fn().mockResolvedValueOnce(json({}, 429, { 'Retry-After': '120' })).mockResolvedValue(json({ ok: true }));
    const first = createAuthRefreshFetch(project, transport, localStorage);
    expect((await first(refreshUrl, { method: 'POST' })).status).toBe(503);
    const second = createAuthRefreshFetch(project, transport, localStorage);
    await second(refreshUrl, { method: 'POST' });
    await vi.advanceTimersByTimeAsync(60_000);
    await first(refreshUrl, { method: 'POST' });
    expect(transport).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await second(refreshUrl, { method: 'POST' })).status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('does not intercept password login, database requests, or another project', async () => {
    const rejected = json({ message: 'Rate limited' }, 429);
    const transport = vi.fn().mockResolvedValue(rejected);
    const guarded = createAuthRefreshFetch(project, transport, localStorage);
    for (const url of [`${project}/auth/v1/token?grant_type=password`, `${project}/rest/v1/profiles`, refreshUrl.replace('auth-test', 'other-project')]) {
      expect(await guarded(url, { method: 'POST' })).toBe(rejected);
    }
    expect(localStorage.length).toBe(0);
  });

  it('keeps a local cooldown if storage is blocked', async () => {
    const transport = vi.fn().mockResolvedValue(json({}, 429));
    const guarded = createAuthRefreshFetch(project, transport, {
      getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); },
    });
    await guarded(refreshUrl, { method: 'POST' });
    await guarded(refreshUrl, { method: 'POST' });
    expect(transport).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    await guarded(refreshUrl, { method: 'POST' });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('preserves an SDK session on 429, but clears it for a revoked refresh token', async () => {
    const user = { id: 'test-user', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' };
    const transport = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes('grant_type=password')) return json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user });
      return json({ message: 'Rate limited' }, 429);
    });
    const client = createClient(project, 'test-key', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: createAuthRefreshFetch(project, transport, localStorage) },
    });
    const events: string[] = [];
    const { data: { subscription } } = client.auth.onAuthStateChange(event => { events.push(event); });
    try {
      await client.auth.signInWithPassword({ email: 'test@example.invalid', password: 'test-password' });
      const pending = client.auth.refreshSession();
      await vi.advanceTimersByTimeAsync(40_000);
      const result = await pending;
      expect(result.error?.name).toBe('AuthRetryableFetchError');
      expect((await client.auth.getSession()).data.session?.refresh_token).toBe('test-refresh');
      expect(events).not.toContain('SIGNED_OUT');
      expect(transport).toHaveBeenCalledTimes(2); // login + one real refresh
      // Once the access token expires, a revoked refresh token must sign out.
      await vi.advanceTimersByTimeAsync(3_600_000);
      transport.mockResolvedValue(json({ message: 'Refresh token revoked', error_code: 'refresh_token_not_found' }, 400));
      await client.auth.refreshSession();
      expect((await client.auth.getSession()).data.session).toBeNull();
      expect(events).toContain('SIGNED_OUT');
    } finally { subscription.unsubscribe(); }
  });
});
