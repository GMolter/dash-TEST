import { AlertBanner } from '../../components/AlertBanner';
import { BannerMessageEditor } from './BannerMessageEditor';

import { invalidBannerSchedule, type BannerDraft } from './bannerDraft';
const field = 'mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-blue-400';

export function TargetedBannerFields({ draft, onChange }: { draft: BannerDraft; onChange: (draft: BannerDraft) => void }) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.65fr)]">
    <div className="min-w-0 space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="text-sm text-slate-300">Banner title<input aria-label="Banner title" className={field} maxLength={80} value={draft.title} onChange={e => onChange({ ...draft, title: e.target.value })} placeholder="Optional title" /></label>
        <label className="text-sm text-slate-300">Banner color<input type="color" className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-white/15 bg-slate-950 p-1" value={draft.color} onChange={e => onChange({ ...draft, color: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Banner color presets">{[['Amber', '#fbbf24'], ['Blue', '#2563eb'], ['Green', '#059669'], ['Red', '#dc2626'], ['Violet', '#7c3aed'], ['Slate', '#334155']].map(([label, color]) => <button key={color} aria-label={label} aria-pressed={draft.color === color} onClick={() => onChange({ ...draft, color })} className={`h-7 w-7 rounded-full border-2 ${draft.color === color ? 'border-white ring-2 ring-white/20' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div>
      <BannerMessageEditor label="Alert message" value={draft.message} maxLength={5000} onChange={message => onChange({ ...draft, message })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Alert start (optional)<input type="datetime-local" className={field + ' [color-scheme:dark]'} value={draft.start} onChange={e => onChange({ ...draft, start: e.target.value })} /></label>
        <label className="text-sm text-slate-300">Alert end (optional)<input type="datetime-local" className={field + ' [color-scheme:dark]'} value={draft.end} onChange={e => onChange({ ...draft, end: e.target.value })} /></label>
      </div>
      <p className="text-xs leading-5 text-slate-400">Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}. Leave blank to start immediately or show until disabled.</p>
      {invalidBannerSchedule(draft) && <p role="alert" className="text-sm text-amber-200">Choose valid times with the end after the start.</p>}
    </div>
    <aside className="min-w-0 self-start rounded-xl border border-white/10 bg-slate-950/30 p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-400">Banner preview</p>
      <AlertBanner title={draft.title} color={draft.color} message={draft.message || 'Your message will appear here.'} />
      <p className="mt-3 text-xs leading-5 text-slate-400">This is how the banner will look on the dashboard. Changes appear after saving.</p>
    </aside>
  </div>;
}
