import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { AlertBanner } from './AlertBanner';

export function TargetedAlerts() {
  const { user } = useAuth();
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState<{ userId: string; rows: { id: string; message: string; title?: string; color?: string }[] } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let version = 0;
    const load = async () => {
      const request = ++version;
      // RLS evaluates the authenticated recipient and current schedule on the server.
      const { data, error } = await supabase.from('dashboard_alerts').select('id,message,title,color').order('created_at');
      if (!cancelled && request === version) setSnapshot({ userId, rows: error ? [] : data || [] });
    };
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(load, 30000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('olio-banner-updated', load);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('olio-banner-updated', load); };
  }, [userId]);
  return <div aria-live="polite">{snapshot?.userId === user?.id && snapshot?.rows.map(row => <div key={row.id} className="mx-auto mt-5 max-w-4xl"><AlertBanner title={row.title} message={row.message} color={row.color} /></div>)}</div>;
}
