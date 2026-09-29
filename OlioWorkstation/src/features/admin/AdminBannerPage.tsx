import { AdminTargetedAlerts } from './AdminTargetedAlerts';
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Eye, Link2, Megaphone, Save } from "lucide-react";
import { BannerMessage } from "../../components/BannerMessage";
import { bannerStatus, safeBannerUrl, toLocalDateTime } from "../../lib/banner";
import { loadAdminResource } from "./api";
import { AdminOperationDialog } from "./AdminOperationDialog";
import type { AdminOperation } from "./types";

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/60";

export function AdminBannerPage({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [operation, setOperation] = useState<Omit<AdminOperation, "reason"> | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSaved(false);
    loadAdminResource({ resource: "app-settings", recordId: "global", page: 1, pageSize: 1, search: "" }).then((result) => {
      if (cancelled) return;
      const row = result.rows[0];
      if (!row) throw new Error("Global app settings are missing. Apply the app settings migration first.");
      setEnabled(row.banner_enabled === true);
      setText(String(row.banner_text || ""));
      setStart(toLocalDateTime(row.banner_starts_at as string | null));
      setEnd(toLocalDateTime(row.banner_ends_at as string | null));
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load banner."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshVersion]);

  const invalidDates = (start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end)));
  const validation = enabled && !text.trim() ? "Add a message before enabling the banner."
    : invalidDates ? "Choose valid start and end times."
    : start && end && Date.parse(end) <= Date.parse(start) ? "End time must be after start time." : "";
  const status = bannerStatus({ enabled, text, startsAt: start, endsAt: end });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const linkValid = label.trim() && !/[\[\]\n]/.test(label) && safeBannerUrl(url.trim());

  function insertLink() {
    if (!linkValid) return;
    const href = safeBannerUrl(url.trim())!.replace(/\(/g, "%28").replace(/\)/g, "%29");
    const link = `[${label.trim()}](${href})`;
    setText(text.slice(0, selection.start) + link + text.slice(selection.end));
    setSaved(false);
    setLinkOpen(false);
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(selection.start + link.length, selection.start + link.length); });
  }

  if (loading) return <p role="status" className="text-sm text-slate-400">Loading banner…</p>;
  if (error) return <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-200">{error}</p>;

  return <div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-slate-400">Keep everyone informed about maintenance, updates, and announcements.</p><p className="mt-1 text-xs text-slate-500">The global banner appears for everyone on the Olio dashboard. Changes go live after saving.</p></div>
      <button disabled={!!validation || !!operation} onClick={() => setOperation({ resource: "app-settings", kind: "update", ids: ["global"], values: { banner_enabled: enabled, banner_text: text, banner_starts_at: start ? new Date(start).toISOString() : null, banner_ends_at: end ? new Date(end).toISOString() : null } })} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"><Save className="h-4 w-4" />Save banner</button>
    </div>
    {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Banner saved. Dashboard updates within 30 seconds.</p>}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5" onChange={() => setSaved(false)}>
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold"><Megaphone className="h-5 w-5 text-blue-300" />Compose your message</h2>
          <div className="mt-5 flex items-center justify-between gap-3"><label htmlFor="banner-message" className="text-sm text-slate-300">Banner message</label><button onClick={() => { const el = textarea.current; setSelection({ start: el?.selectionStart ?? text.length, end: el?.selectionEnd ?? text.length }); setLabel(text.slice(el?.selectionStart ?? text.length, el?.selectionEnd ?? text.length)); setUrl(""); setLinkOpen(!linkOpen); }} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-blue-300 hover:bg-blue-400/10"><Link2 className="h-4 w-4" />Insert link</button></div>
          <textarea id="banner-message" ref={textarea} value={text} onChange={(event) => setText(event.target.value)} rows={7} className={inputClass + " resize-y leading-relaxed"} placeholder="Scheduled maintenance this Friday. We'll be back shortly." />
          <p className="mt-2 text-xs text-slate-500">Select text and insert a link, or use [link text](https://example.com).</p>
          {linkOpen && <div className="mt-4 space-y-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4"><label className="block text-sm text-slate-300">Link text<input className={inputClass} value={label} onChange={(event) => setLabel(event.target.value)} /></label><label className="block text-sm text-slate-300">Link URL<input type="url" placeholder="https://example.com" className={inputClass} value={url} onChange={(event) => setUrl(event.target.value)} /></label><p className="text-xs text-slate-400">Use a full HTTP or HTTPS URL. Links open in a new tab.</p><button disabled={!linkValid} onClick={insertLink} className="rounded-lg bg-blue-500 px-3 py-2 text-sm disabled:opacity-40">Add link</button><button onClick={() => setLinkOpen(false)} className="ml-3 text-sm text-slate-400">Cancel</button></div>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="h-5 w-5 text-blue-300" />Visibility & schedule</h2>
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-blue-500" /><span><span className="block text-sm font-medium">Enable banner</span><span className="text-xs text-slate-400">Show immediately or during the scheduled window.</span></span></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Start time (optional)<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass + " [color-scheme:dark]"} /></label><label className="text-sm text-slate-300">End time (optional)<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass + " [color-scheme:dark]"} /></label></div>
          <p className="mt-3 text-xs leading-5 text-slate-400">Times are in {timezone}. Leave start blank to show immediately, and end blank to keep showing until disabled.</p>
          {(start || end) && <button onClick={() => { setStart(""); setEnd(""); setSaved(false); }} className="mt-2 text-xs text-blue-300">Clear schedule</button>}
          {validation && <p role="alert" className="mt-3 text-sm text-amber-200">{validation}</p>}
        </section>
      </div>
      <section className="self-start rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Eye className="h-5 w-5 text-blue-300" />Live preview</h2><span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">{status}</span></div>
        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/[0.09] p-5 text-sm leading-relaxed text-amber-100"><BannerMessage text={text || "Your banner message will appear here."} /></div>
        <p className="mt-4 text-xs leading-5 text-slate-400">Preview includes unsaved changes. {status === "Hidden" ? "Enable the banner to display it on the dashboard." : status === "Scheduled" ? "The banner will appear automatically at the start time." : status === "Ended" ? "This schedule has ended. Update the end time to show it again." : "The banner will be visible once saved."}</p>
      </section>
    </div>
    <AdminTargetedAlerts />
    <AdminOperationDialog operation={operation} title="Save dashboard banner" onCancel={() => setOperation(null)} onComplete={() => { setOperation(null); setSaved(true); window.dispatchEvent(new Event("olio-banner-updated")); }} />
  </div>;
}
