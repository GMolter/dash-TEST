export type LauncherAuthorizationLocation = { requestId: string; displayCode: string };
export type LauncherAuthorizationAccess = 'loading' | 'sign-in' | 'authorize';

export function parseLauncherAuthorizationLocation(pathname: string, search: string): LauncherAuthorizationLocation | null {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  if (cleanPath !== '/launcher/authorize') return null;
  const parameters = new URLSearchParams(search);
  return {
    requestId: parameters.get('request') ?? '',
    displayCode: parameters.get('code') ?? '',
  };
}

export function launcherAuthorizationAccess(authLoading: boolean, hasUser: boolean, allowSignIn: boolean): LauncherAuthorizationAccess {
  if (authLoading || (!hasUser && !allowSignIn)) return 'loading';
  return hasUser ? 'authorize' : 'sign-in';
}

