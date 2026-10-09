import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Paperclip } from 'lucide-react';
import { FeaturePlanViewer } from './FeaturePlanViewer';
import { downloadPlanFile, readPlanFile, savePlanFile } from './featurePlanFiles';

export function FeaturePlanAttachment({ ideaId, title, initialName }: { ideaId: string; title: string; initialName?: string | null }) {
  const [name, setName] = useState(initialName || '');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(false);
  const [viewing, setViewing] = useState(false);
  useEffect(() => { setName(initialName || ''); }, [initialName]);
  async function run(action: () => Promise<void>) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update the planning file.'); }
    finally { working.current = false; setBusy(false); }
  }
  const button = 'rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40';
  return <div className="mt-3 space-y-2 border-t border-white/5 pt-3" aria-label={`Planning file for ${title}`}>
    <div className="flex flex-wrap items-center gap-2">
      {name && <>
        <button type="button" disabled={busy} className={`${button} inline-flex max-w-full items-center gap-2 text-blue-200`} onClick={() => setViewing(true)} aria-label={`View ${name}`}><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{name}</span></button>
        <button type="button" disabled={busy} className={`${button} inline-flex items-center gap-2`} onClick={() => void run(() => downloadPlanFile(ideaId))} aria-label={`Download ${name}`}><Download className="h-3.5 w-3.5" />Download</button>
      </>}
      <label className={`${button} inline-flex cursor-pointer items-center gap-2 text-slate-300 ${busy ? 'opacity-40' : ''}`}><Paperclip className="h-3.5 w-3.5" />{busy ? 'Working…' : name ? 'Replace plan' : 'Upload plan'}<input className="sr-only" type="file" accept=".md,.txt,text/plain,text/markdown" disabled={busy} aria-label={`Upload planning file for ${title}`} onChange={e => {
        const file = e.target.files?.[0]; e.target.value = '';
        if (file) void run(async () => { const plan = await readPlanFile(file); await savePlanFile(ideaId, plan); setName(plan.name); setRemoving(false); setNotice('Planning file saved.'); });
      }} /></label>
      {name && <button type="button" className={button} disabled={busy} onClick={() => setRemoving(true)}>Remove plan</button>}
      <span className="text-xs text-slate-500">One .md or .txt file · up to 256 KB</span>
    </div>
    {removing && <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300"><span>Remove {name}?</span><button type="button" className={button} disabled={busy} onClick={() => void run(async () => { await savePlanFile(ideaId, null); setName(''); setRemoving(false); setNotice('Planning file removed.'); })}>Confirm removal</button><button type="button" className={button} disabled={busy} onClick={() => setRemoving(false)}>Cancel</button></div>}
    {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-200">{notice}</p>}
    {viewing && <FeaturePlanViewer ideaId={ideaId} title={title} onClose={() => setViewing(false)} />}
  </div>;
}
