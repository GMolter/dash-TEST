import { useEffect } from 'react';

export function useSupportRefresh(refresh: () => void, changes = false) {
  useEffect(() => {
    const visible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const timer = window.setInterval(visible, 30_000);
    window.addEventListener('focus', visible);
    window.addEventListener('popstate', visible);
    document.addEventListener('visibilitychange', visible);
    if (changes) window.addEventListener('support-changed', visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', visible);
      window.removeEventListener('popstate', visible);
      document.removeEventListener('visibilitychange', visible);
      if (changes) window.removeEventListener('support-changed', visible);
    };
  }, [refresh, changes]);
}
