import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export function EmailPreviewDialog({ children, onClose, busy }: { children: ReactNode; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} aria-label="Email preview" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[min(48rem,95vw)] overflow-auto rounded-2xl border border-white/15 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4"><h2 className="font-semibold">Email preview</h2><button autoFocus disabled={busy} onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40">Back to editing</button></header>
    <div className="p-6" aria-busy={busy}>{children}</div>
  </dialog>, document.body);
}
