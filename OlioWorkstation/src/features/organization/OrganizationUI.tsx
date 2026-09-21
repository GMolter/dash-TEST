import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function OrganizationModal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const pending = useRef(busy); pending.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending.current) { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]') ?? []);
      const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  return createPortal(<div className="org-modal-backdrop"><div className="org-workspace org-modal" ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
    <div className="org-section-heading"><h2 id={id}>{title}</h2><button className="org-icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button></div>
    {children}
  </div></div>, document.body);
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="org-empty"><h3>{title}</h3><p>{children}</p></div>;
}
export function RoleBadge({ role }: { role: string }) {
  return <span className={`org-role org-role-${role}`}>{role}</span>;
}
export function displayDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
