import { useId, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { safeBannerUrl } from '../../lib/banner';

const field = 'mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400';

export function BannerMessageEditor({ value, onChange, label = 'Banner message', maxLength }: { value: string; onChange: (value: string) => void; label?: string; maxLength?: number }) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const href = safeBannerUrl(url.trim());
  const link = `[${text.trim()}](${href?.replace(/\(/g, '%28').replace(/\)/g, '%29')})`;
  const tooLong = !!maxLength && value.length - (selection.end - selection.start) + link.length > maxLength;
  const valid = text.trim() && !text.includes('[') && !text.includes(']') && !text.includes('\n') && href && !tooLong;

  return <div>
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-slate-300">{label}</label>
      <button type="button" aria-expanded={linkOpen} onClick={() => {
        const start = textarea.current?.selectionStart ?? value.length;
        const end = textarea.current?.selectionEnd ?? value.length;
        setSelection({ start, end }); setText(value.slice(start, end)); setUrl(''); setLinkOpen(!linkOpen);
      }} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-blue-300 hover:bg-blue-400/10"><Link2 className="h-4 w-4" />Insert link</button>
    </div>
    <textarea id={id} ref={textarea} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} rows={4} className={field + ' resize-y leading-relaxed'} placeholder="What should people know?" />
    <p className="mt-2 text-xs text-slate-400">Select words to turn them into a link, or insert a new link at the cursor.</p>
    {linkOpen && <div className="mt-3 space-y-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Link text<input autoFocus className={field} value={text} onChange={e => setText(e.target.value)} /></label>
        <label className="text-sm text-slate-300">Link URL<input type="url" className={field} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" /></label>
      </div>
      <p className="text-xs text-slate-400">Use a full HTTP or HTTPS URL. Links open in a new tab.</p>
      {tooLong && <p role="alert" className="text-xs text-amber-200">This link would exceed the message limit.</p>}
      <button type="button" disabled={!valid} onClick={() => {
        if (!valid) return;
        onChange(value.slice(0, selection.start) + link + value.slice(selection.end)); setLinkOpen(false);
        requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(selection.start + link.length, selection.start + link.length); });
      }} className="rounded-lg bg-blue-500 px-3 py-2 text-sm disabled:opacity-40">Add link</button>
      <button type="button" onClick={() => setLinkOpen(false)} className="ml-3 text-sm text-slate-300">Cancel link</button>
    </div>}
  </div>;
}
