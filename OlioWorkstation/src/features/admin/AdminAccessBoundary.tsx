import { clearAdminQuicklinkClipboard } from './AdminQuicklinkBulkTools';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { AccessCheckError, startAccessPolling, type AdminAccessSnapshot } from './accessPolling';
const AccessContext = createContext<AdminAccessSnapshot | null>(null);
export const useAdminAccess = () => useContext(AccessContext);
export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AdminAccessSnapshot | null>(null);
  const [healthy, setHealthy] = useState(true);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    let disposed = false, sessionId: string | undefined, generation = 0;
    let controller: ReturnType<typeof startAccessPolling> | undefined;
    const begin = (id: string | undefined) => {
      if (disposed || (controller && id === sessionId)) return;
      controller?.stop(); clearAdminQuicklinkClipboard(); sessionId = id; const current = ++generation; let hadSnapshot = false; setSnapshot(null); setChanged(false);
      if (!id) { window.location.assign('/'); return; }
      controller = startAccessPolling({
        load: async signal => {
          const { data } = await supabase.auth.getSession();
          if (!data.session || data.session.user.id !== id) throw new AccessCheckError(401, 'invalid-session');
          const response = await fetch('/api/admin/access-state', { signal, cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}` } });
          const body = await response.json();
          if (!response.ok) throw new AccessCheckError(response.status, body.accountStatus);
          return body;
        },
        changed: next => { if (!disposed && generation === current) { if (hadSnapshot) { clearAdminQuicklinkClipboard(); setChanged(true); } hadSnapshot = true; setSnapshot(next); } },
        health: value => { if (!disposed && generation === current) setHealthy(value); },
        denied: () => { if (!disposed && generation === current) { clearAdminQuicklinkClipboard(); setSnapshot(null); window.location.assign('/'); } },
      });
    };
    void supabase.auth.getSession().then(({ data }) => { if (!controller) begin(data.session?.user.id); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => begin(session?.user.id));
    const check = () => { void controller?.check(); };
    window.addEventListener('focus', check); window.addEventListener('online', check); window.addEventListener('admin-authorization-error', check);
    return () => { disposed = true; clearAdminQuicklinkClipboard(); generation++; controller?.stop(); subscription.subscription.unsubscribe(); window.removeEventListener('focus', check); window.removeEventListener('online', check); window.removeEventListener('admin-authorization-error', check); };
  }, []);
  if (!snapshot) return <div role="status" className="p-8 text-slate-300">{healthy ? 'Verifying administrator access…' : 'Access verification unavailable. Retrying shortly…'}</div>;
  return <AccessContext.Provider value={snapshot}>
    {!healthy && <div role="status" className="bg-amber-950 p-3 text-amber-100">Access verification unavailable. Actions are paused until verification succeeds.</div>}
    {changed && <div role="status" className="bg-blue-950 p-3 text-blue-100">Your admin access has been updated.</div>}
    <fieldset disabled={!healthy} className="min-w-0 border-0 p-0 m-0" key={`${snapshot.userId}:${snapshot.accessVersion}`}>{children}</fieldset>
  </AccessContext.Provider>;
}
