import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { downloadPlanFile, loadPlanFile } from './featurePlanFiles';

export function FeaturePlanViewer({ ideaId, title, onClose }: { ideaId: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [plan, setPlan] = useState<{ name: string; content: string } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    let active = true;
    setPlan(null); setError('');
    loadPlanFile(ideaId).then(result => { if (active) setPlan(result); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load this plan.'); });
    return () => { active = false; };
  }, [ideaId, revision]);
  async function download() {
    if (downloadingRef.current) return;
    downloadingRef.current = true; setDownloading(true); setError('');
    try { await downloadPlanFile(ideaId); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not download this plan.'); }
    finally { downloadingRef.current = false; setDownloading(false); }
  }
  return createPortal(<dialog ref={dialog} aria-labelledby={headingId} onCancel={onClose} onClose={onClose} className="m-auto w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
    <div className="flex max-h-[85dvh] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 p-4">
        <div className="min-w-0 flex-1"><h2 id={headingId} className="truncate font-semibold">{plan?.name || 'Planning file'}</h2><p className="mt-1 truncate text-xs text-slate-400">{title}</p></div>
        <button type="button" disabled={!plan || downloading} onClick={() => void download()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40"><Download className="h-4 w-4" />{downloading ? 'Downloading…' : 'Download'}</button>
        <button autoFocus type="button" aria-label="Close plan viewer" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>
      {error && <div role="alert" className="p-4 text-sm text-red-200">{error}{!plan && <button className="ml-3 underline" onClick={() => setRevision(v => v + 1)}>Retry</button>}</div>}
      {!plan && !error && <p role="status" className="p-6 text-sm text-slate-400">Loading plan…</p>}
      {plan && <div className="overflow-auto p-5 sm:p-6">{plan.content ? <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed [tab-size:2]">{plan.content}</pre> : <p className="text-sm text-slate-400">This planning file is empty.</p>}</div>}
    </div>
  </dialog>, document.body);
}
