import { describe, expect, it } from 'vitest';
import { launcherAuthorizationAccess, parseLauncherAuthorizationLocation } from './authorizationRoute';

describe('launcher authorization route', () => {
  it('preserves the authorization route through the normal signed-out sign-in screen', () => {
    const location = parseLauncherAuthorizationLocation(
      '/launcher/authorize',
      '?request=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1&code=23456-789AB',
    );
    expect(location).toEqual({
      requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      displayCode: '23456-789AB',
    });
    expect(launcherAuthorizationAccess(false, false, true)).toBe('sign-in');
    expect(launcherAuthorizationAccess(false, true, true)).toBe('authorize');
  });

  it('rejects unrelated paths and keeps malformed values for generic server validation', () => {
    expect(parseLauncherAuthorizationLocation('/profile', '?request=x&code=y')).toBeNull();
    expect(parseLauncherAuthorizationLocation('/launcher/authorize', '')).toEqual({ requestId: '', displayCode: '' });
    expect(launcherAuthorizationAccess(true, false, false)).toBe('loading');
  });
});

