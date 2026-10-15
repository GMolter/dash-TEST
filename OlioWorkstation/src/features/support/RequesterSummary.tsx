import { useEffect, useState } from 'react';
import { loadAdminUserAccount } from '../admin/api';
import type { AdminRow } from '../admin/types';
import { useAdminCapabilities } from '../admin/useAdminCapabilities';

export function RequesterSummary({ userId, fallbackName }: { userId: string; fallbackName: string }) {
  const { can } = useAdminCapabilities();
  const allowed = can('users.read');
  const [user, setUser] = useState<AdminRow>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setUser(undefined); setError(false);
    if (allowed) void loadAdminUserAccount(userId).then(result => {
      if (active) setUser(result.user);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [userId, allowed, retry]);
  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || String(user.display_name || fallbackName) : fallbackName;
  return <aside aria-label="Requester details" className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Submitted by</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      {allowed ? <a href={`/admin?section=people&account=${encodeURIComponent(userId)}`} className="break-words text-lg font-semibold text-violet-200 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">{name}<span className="ml-2 text-sm font-normal">View account →</span></a> : <p className="font-semibold">{name}</p>}
    </div>
    {!allowed ? <p className="mt-2 text-sm text-slate-400">Account details require People access.</p> : error ? <p role="status" className="mt-3 text-sm text-amber-200">Could not load account details. <button className="underline" onClick={() => setRetry(value => value + 1)}>Try again</button></p> : !user ? <p role="status" className="mt-3 text-sm text-slate-400">Loading account details…</p> : <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div className="min-w-0"><dt className="text-slate-400">Email</dt><dd className="mt-1 break-words">{String(user.email || (can('users.fields.email.read') ? 'No email address' : 'Restricted'))}</dd></div>
      <div className="min-w-0"><dt className="text-slate-400">Organization</dt><dd className="mt-1 break-words">{user._admin_refs?.org_id?.label || (can('users.fields.org_id.read') ? 'No organization' : 'Restricted')}</dd></div>
      <div><dt className="text-slate-400">Organization role</dt><dd className="mt-1 capitalize">{String(user.role || (can('users.fields.role.read') ? 'Not set' : 'Restricted'))}</dd></div>
    </dl>}
  </aside>;
}
