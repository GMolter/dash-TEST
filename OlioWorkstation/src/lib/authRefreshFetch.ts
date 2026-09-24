// Supabase treats HTTP 429 during refresh as a terminal auth error and removes
// the session, broadcasting SIGNED_OUT to other tabs. Treat only this temporary
// refresh failure as retryable, and share a cooldown across tabs and reloads.
export function createAuthRefreshFetch(
  projectUrl: string,
  transport: typeof fetch = (...args) => fetch(...args),
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): typeof fetch {
  const endpoint = new URL(`${projectUrl.replace(/\/$/, '')}/auth/v1/token`);
  const storageKey = `olio-refresh-backoff:${endpoint.origin}`;
  let retryAt = 0;
  const paused = () => new Response(JSON.stringify({ message: 'Session refresh is temporarily rate limited. Please wait before retrying.' }), {
    // The SDK recognizes 503 as retryable and preserves the refresh token.
    status: 503, headers: { 'Content-Type': 'application/json' },
  });
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    if (method.toUpperCase() !== 'POST' || url.origin !== endpoint.origin || url.pathname !== endpoint.pathname || url.searchParams.get('grant_type') !== 'refresh_token') {
      return transport(input, init);
    }
    try {
      const stored = Number(storage?.getItem(storageKey));
      if (Number.isFinite(stored)) retryAt = Math.max(retryAt, stored);
    } catch { /* In-memory cooldown still works when storage is unavailable. */ }
    if (Date.now() < retryAt) return paused();
    const response = await transport(input, init);
    if (response.status !== 429) return response;
    const now = Date.now();
    const header = response.headers.get('Retry-After');
    const seconds = header === null ? NaN : Number(header);
    const deadline = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(header ?? '');
    retryAt = Math.max(now + 60_000, Number.isFinite(deadline) ? deadline : 0);
    try { storage?.setItem(storageKey, String(retryAt)); } catch { /* Storage is optional. */ }
    return paused();
  };
}
