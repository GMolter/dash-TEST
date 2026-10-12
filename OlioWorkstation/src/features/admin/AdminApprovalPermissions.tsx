import { useEffect, useState } from 'react';
import { AdminPermissionPicker } from './AdminPermissionPicker';
import { adminFetch } from './api';

type Item = { key: string; label: string; parent?: string; ownerOnly?: boolean };
type Catalog = { enabled: boolean; catalog: Item[]; presets: Record<string, string[]> };
export type ApprovalPermissions = { preset: string; permissions: string[]; revision: number };

export function AdminApprovalPermissions({ requestId, disabled, onChange }: {
  requestId: string; disabled: boolean; onChange: (choice: ApprovalPermissions | null | undefined) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [choice, setChoice] = useState<ApprovalPermissions>();
  const [deletion, setDeletion] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    onChange(undefined);
    setCatalog(undefined); setChoice(undefined); setDeletion(false); setError('');
    async function load() {
      const result = await adminFetch(`/api/admin/data?resource=admin-access-requests&record=${encodeURIComponent(requestId)}`);
      const request = result.rows?.[0];
      if (!request) throw new Error('Pending request could not be loaded.');
      if (request.request_kind === 'account_deletion') {
        if (!cancelled) { setDeletion(true); onChange(null); }
        return;
      }
      const [nextCatalog, assignment] = await Promise.all([
        adminFetch('/api/admin/data?resource=permission-catalog'),
        adminFetch(`/api/admin/data?resource=permission-assignment&userId=${encodeURIComponent(request.target_user_id)}`),
      ]);
      if (cancelled) return;
      if (!nextCatalog.enabled) throw new Error('Enable permission assignments in your deployment before approving admin access.');
      const preset = ['read-only', 'custom', 'full'].includes(request.proposed_preset) ? request.proposed_preset : 'read-only';
      const next = { preset, permissions: request.proposed_grants || nextCatalog.presets[preset], revision: assignment.revision };
      setCatalog(nextCatalog); setChoice(next); onChange(next);
    }
    load().catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [requestId, onChange]);
  if (deletion) return null;
  if (error) return <p role="alert" className="text-red-200">{error}</p>;
  if (!catalog || !choice) return <p role="status">Loading permission choices…</p>;
  return <AdminPermissionPicker catalog={catalog} value={choice} disabled={disabled} onChange={next => { const updated = { ...next, revision: choice.revision }; setChoice(updated); onChange(updated); }} />;
}
