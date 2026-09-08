import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { executeAdminOperation, prepareAdminOperation } from "./api";
import type { AdminOperation, PreparedOperation } from "./types";

type Props = {
  operation: Omit<AdminOperation, "reason"> | null;
  title: string;
  onCancel: () => void;
  onComplete: (result: unknown) => void;
};

export function AdminOperationDialog({ operation, title, onCancel, onComplete }: Props) {
  const [reason, setReason] = useState("");
  const [prepared, setPrepared] = useState<PreparedOperation | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setPrepared(null);
    setConfirmation("");
    setError(null);
  }, [operation]);

  if (!operation) return null;
  const completeOperation: AdminOperation = { ...operation, reason };

  async function review() {
    if (reason.trim().length < 3) {
      setError("Enter a reason of at least 3 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await prepareAdminOperation(completeOperation);
      setPrepared(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not prepare this operation.");
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    if (!prepared || confirmation !== prepared.confirmation) return;
    setBusy(true);
    setError(null);
    try {
      const response = await executeAdminOperation(completeOperation, prepared, confirmation);
      onComplete(response.result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-operation-title">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl shadow-blue-950/50">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
              {prepared ? <ShieldCheck className="h-5 w-5 text-blue-300" /> : <AlertTriangle className="h-5 w-5 text-amber-300" />}
            </div>
            <div>
              <h2 id="admin-operation-title" className="font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">Every admin action is confirmed and permanently audited.</p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          {!prepared ? (
            <>
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Reason for this action</span>
                <textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50"
                  placeholder="Explain why this administrative action is necessary." />
              </label>
              <div className="rounded-xl border border-blue-400/15 bg-blue-400/5 px-3 py-2 text-xs text-slate-400">
                The reason, actor, targets, changed field names, and result will be written to the audit trail. Sensitive values are never copied there.
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewStat label="Action" value={prepared.preview.action} />
                <PreviewStat label="Resource" value={prepared.preview.resource} />
                <PreviewStat label="Records" value={String(prepared.preview.count)} />
              </div>
              {prepared.preview.changes.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Fields changing</div>
                  <div className="mt-2 flex flex-wrap gap-2">{prepared.preview.changes.map((field) => <span key={field} className="rounded-md bg-blue-400/10 px-2 py-1 text-xs text-blue-200">{field}</span>)}</div>
                </div>
              )}
              {Object.keys(prepared.preview.impact).length > 0 && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
                  <div className="text-sm font-medium text-red-100">Related records that may be affected</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-300">
                    {Object.entries(prepared.preview.impact).map(([label, count]) => <div key={label} className="flex justify-between rounded-lg bg-black/20 px-2 py-1"><span>{label}</span><span>{count}</span></div>)}
                  </div>
                </div>
              )}
              <label className="block">
                <span className="text-sm text-slate-300">Type <code className="rounded bg-slate-800 px-1.5 py-0.5 text-blue-200">{prepared.confirmation}</code> to authorize</span>
                <input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </label>
            </>
          )}

          {error && <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-black/15 px-5 py-4">
          <button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          {!prepared ? (
            <button onClick={review} disabled={busy || reason.trim().length < 3} className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 disabled:opacity-40">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Review operation
            </button>
          ) : (
            <button onClick={execute} disabled={busy || confirmation !== prepared.confirmation} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Execute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-medium capitalize text-slate-100">{value}</div></div>;
}
