import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { BannerMessage } from './BannerMessage';

export function TargetedAlerts() {
  const { user } = useAuth();
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState<{ userId: string; rows: { id: string; message: string }[] } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let version = 0;
    const load = async () => {
      const request = ++version;
      // RLS evaluates the authenticated recipient and current schedule on the server.
      const { data, error } = await supabase.from('dashboard_alerts').select('id,message').order('created_at');
      if (!cancelled && request === version) setSnapshot({ userId, rows: error ? [] : data || [] });
    };
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(load, 30000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('olio-banner-updated', load);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('olio-banner-updated', load); };
  }, [userId]);
  return <div aria-live="polite">{snapshot?.userId === user?.id && snapshot?.rows.map(row => <div key={row.id} className="mx-auto mt-5 max-w-4xl rounded-3xl border border-amber-300/20 bg-slate-900/90 px-6 py-4 text-left text-amber-100 backdrop-blur-xl"><p className="mb-1 text-xs font-semibold uppercase tracking-wide">Admin alert</p><BannerMessage text={row.message} /></div>)}</div>;
}
