import { useEffect, useState } from 'react';
import { unreadTickets } from './api';

export function SupportBadge({ admin = false, location = '' }: { admin?: boolean; location?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      const request = ++generation;
      try { const next = await unreadTickets(admin); if (active && request === generation) setCount(next); }
      catch { if (active && request === generation) setCount(0); }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    const events = ['focus', 'popstate', 'support-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, refresh)); document.removeEventListener('visibilitychange', refresh); };
  }, [admin, location]);
  return count > 0 ? <span aria-label={`${count} unread support tickets`} className="ml-2 rounded-full bg-violet-500 px-2 py-0.5 text-xs text-white">{count}</span> : null;
}
