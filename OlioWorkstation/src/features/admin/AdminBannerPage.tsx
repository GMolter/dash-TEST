import { AdminTargetedAlerts } from './AdminTargetedAlerts';
import { useEffect, useState } from "react";
import { CalendarClock, Eye, Megaphone, Pencil, Save } from "lucide-react";
import { BannerMessageEditor } from './BannerMessageEditor';
import { BannerMessage } from "../../components/BannerMessage";
import { bannerStatus, toLocalDateTime } from "../../lib/banner";
import { loadAdminResource } from "./api";
import { AdminOperationDialog } from "./AdminOperationDialog";
import type { AdminOperation } from "./types";

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/60";

function GlobalBannerSettings({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  const [operation, setOperation] = useState<Omit<AdminOperation, "reason"> | null>(null);

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
  }, [refreshVersion, reload]);

  const invalidDates = (start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end)));
  const validation = enabled && !text.trim() ? "Add a message before enabling the banner."
    : invalidDates ? "Choose valid start and end times."
    : start && end && Date.parse(end) <= Date.parse(start) ? "End time must be after start time." : "";
  const status = bannerStatus({ enabled, text, startsAt: start, endsAt: end });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (loading) return <p role="status" className="text-sm text-slate-400">Loading banner…</p>;
  if (error) return <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-200">{error}</p>;

  return <div className="mx-auto max-w-6xl space-y-8">
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-400/10 p-3"><Megaphone className="h-5 w-5 text-blue-300" /></div><div><h2 className="font-semibold">Everyone</h2><p className="mt-1 text-xs text-slate-400">One announcement across all dashboards · {status}</p></div></div>
        <button disabled={!!operation} onClick={() => { if (editing) setReload(v => v + 1); setEditing(!editing); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-blue-200 hover:bg-white/5"><Pencil className="h-4 w-4" />{editing ? 'Cancel edit' : status === 'Live' || status === 'Scheduled' ? 'Edit global banner' : 'Create global banner'}</button>
      </div>
      {!editing && (status === 'Live' || status === 'Scheduled') && <div className="mx-5 mb-5 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100"><BannerMessage text={text} /></div>}
    {editing && <div className="border-t border-white/10 p-5 sm:p-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-slate-400">Keep everyone informed about maintenance, updates, and announcements.</p><p className="mt-1 text-xs text-slate-500">The global banner appears for everyone on the Olio dashboard. Changes go live after saving.</p></div>
      <button disabled={!!validation || !!operation} onClick={() => setOperation({ resource: "app-settings", kind: "update", ids: ["global"], values: { banner_enabled: enabled, banner_text: text, banner_starts_at: start ? new Date(start).toISOString() : null, banner_ends_at: end ? new Date(end).toISOString() : null } })} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"><Save className="h-4 w-4" />Save banner</button>
    </div>
    {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Banner saved. Dashboard updates within 30 seconds.</p>}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5" onChange={() => setSaved(false)}>
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold"><Megaphone className="h-5 w-5 text-blue-300" />Compose your message</h2>
          <div className="mt-5"><BannerMessageEditor value={text} onChange={value => { setText(value); setSaved(false); }} /></div>
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
    </div>}
    </section>
    {saved && !editing && <p role="status" className="text-sm text-emerald-300">Banner saved. Dashboard updates within 30 seconds.</p>}
    <AdminOperationDialog operation={operation} title="Save dashboard banner" onCancel={() => setOperation(null)} onComplete={() => { setOperation(null); setSaved(true); setEditing(false); window.dispatchEvent(new Event("olio-banner-updated")); }} />
  </div>;
}

export function AdminBannerPage({ refreshVersion = 0 }: { refreshVersion?: number }) {
  return <div className="mx-auto max-w-6xl space-y-8">
    <p className="text-sm text-slate-400">Manage what people see on their dashboard. Create a message for everyone or choose a specific audience.</p>
    <GlobalBannerSettings refreshVersion={refreshVersion} />
    <AdminTargetedAlerts refreshVersion={refreshVersion} />
  </div>;
}
