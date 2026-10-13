import { useCallback, useEffect, useRef, useState } from 'react';
import { Mail, Plus, Send, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  deliveryLabels,
  emailEvents,
  type EmailDraft,
} from '../../../shared/email';
import { EmailEditor } from './EmailEditor';
import { emailApi } from './emailApi';
import { EmailRecipients } from './EmailRecipients';
import { EmailPreviewDialog } from './EmailPreviewDialog';
type Preferences = Record<(typeof emailEvents)[number], boolean>;
type State = {
  owner: boolean;
  canSend: boolean;
  canTemplates: boolean;
  canHistory: boolean;
  deliveryEnabled: boolean;
  preferences: Preferences | null;
};
type Template = {
  id: string;
  name: string;
  subject: string;
  html: string;
  shared: boolean;
};
type Attachment = { id: string; name: string; size?: number };
type Preview = {
  token: string;
  subject: string;
  html: string;
  recipients: string[];
  scheduled_at: string;
  timezone: string;
  attachmentCount: number;
};
type Message = {
  id: string;
  subject: string;
  scheduled_at: string;
  timezone: string;
  email_jobs: {
    id: string;
    recipient: string;
    status: string;
    attempts: number;
    error_code?: string;
    completed_at?: string;
    available_at?: string;
    email_attempts?: { attempt: number; status: string; error_code?: string; created_at: string }[];
  }[];
};
type Admin = {
  id: string;
  email: string;
  display_name: string;
  app_owner: boolean;
};
const empty = (): EmailDraft => ({
  id: '',
  revision: 0,
  subject: '',
  html: '',
  recipients: [],
  attachment_ids: [],
});
const defaults: Preferences = {
  signup: false,
  organization: false,
  review: false,
  failure: false,
};
const labels: Record<string, string> = {
  signup: 'New signups',
  organization: 'New organizations',
  review: 'Pending admin reviews (owners)',
  failure: 'Email failures and uncertain outcomes',
};
const field =
  'w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white';
const button =
  'rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40';
export function AdminEmailPage({
  refreshVersion = 0,
}: {
  refreshVersion?: number;
}) {
  const [state, setState] = useState<State | null>(null),
    [tab, setTab] = useState('My notifications');
  const initialized = useRef(false);
  const [linkedJob, setLinkedJob] = useState(() => new URLSearchParams(window.location.search).get('emailJob') || '');
  const [draft, setDraft] = useState<EmailDraft>(empty),
    [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [templateContent, setTemplateContent] = useState({
    subject: '',
    html: '',
  });
  const [templates, setTemplates] = useState<Template[]>([]),
    [templateId, setTemplateId] = useState(''),
    [templateName, setTemplateName] = useState(''),
    [shared, setShared] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]),
    [preview, setPreview] = useState<Preview | null>(null),
    [key, setKey] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [local, setLocal] = useState(''),
    [timezone, setTimezone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [occurrence, setOccurrence] = useState('reject');
  const [systemMessages, setSystemMessages] = useState<
    {
      id: string;
      recipient: string;
      kind: string;
      status: string;
      created_at: string;
      error_code?: string;
    }[]
  >([]);
  const [messages, setMessages] = useState<Message[]>([]),
    [global, setGlobal] = useState(false),
    [page, setPage] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>(defaults),
    [admins, setAdmins] = useState<Admin[]>([]),
    [admin, setAdmin] = useState(''),
    [adminPreferences, setAdminPreferences] = useState<
      (Preferences & { user_id: string })[]
    >([]);
  const [selectedPreferences, setSelectedPreferences] = useState<Preferences>(defaults);
  const [health, setHealth] = useState<{
    paused: boolean;
    error_code?: string;
    last_dispatch_at?: string;
    worker_until?: string;
  } | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const loadState = useCallback(async () => {
    const data = await emailApi('state');
    setState(data);
    return data;
  }, []);
  useEffect(() => {
    void loadState().then(data => {
      if (!initialized.current) {
        initialized.current = true;
        if (linkedJob && data.canHistory) { setTab('Outgoing history'); setGlobal(!!data.owner); }
        else if (data.canSend) setTab('Compose');
      }
    }).catch((e) => setError(e.message));
  }, [loadState, refreshVersion, linkedJob]);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email action failed.');
    } finally {
      setBusy(false);
    }
  };
  const change = (patch: Partial<EmailDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setPreview(null);
  };
  const loadTab = useCallback(async () => {
    if (tab === 'Drafts') setDrafts((await emailApi('drafts')).drafts);
    if (tab === 'Templates' || (tab === 'Compose' && state?.canSend))
      setTemplates((await emailApi('templates')).templates);
    if (tab === 'Scheduled' || tab === 'Outgoing history') {
      const data = await emailApi('history', { global, page, ...(linkedJob ? { job_id: linkedJob } : {}) });
      setMessages(data.messages);
      setSystemMessages(data.system || []);
      setHealth(data.health || null);
      setCheckedAt(data.checkedAt || new Date().toISOString());
      if (typeof data.deliveryEnabled === 'boolean') setState(current => current ? { ...current, deliveryEnabled: data.deliveryEnabled } : current);
    }
    if (tab === 'Administration') {
      const data = await emailApi('administration');
      setAdmins(data.admins);
      setAdminPreferences(data.preferences);
      setHealth(data.health);
    }
    if (tab === 'My notifications') {
      const data = await loadState();
      setPreferences(data.preferences || defaults);
    }
  }, [tab, global, page, state?.canSend, loadState, linkedJob]);
  useEffect(() => {
    void loadTab().catch((e) => setError(e.message));
  }, [loadTab, refreshVersion]);
  useEffect(() => {
    if (tab !== 'Outgoing history' && tab !== 'Scheduled') return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!document.hidden) {
        try { await loadTab(); } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Could not refresh delivery status.'); }
      }
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [tab, loadTab]);
  const openDraft = async (next: EmailDraft) => {
    setDraft(next);
    setPreview(null);
    setLocal('');
    setAttachments(
      next.attachment_ids.length
        ? (await emailApi('attachments', { ids: next.attachment_ids }))
            .attachments
        : [],
    );
    setTab('Compose');
  };
  const save = async () => {
    const result = await emailApi('save-draft', { ...draft });
    setDraft(result.draft);
    return result.draft as EmailDraft;
  };
  const tabs = [
    ...(state?.canSend ? ['Compose', 'Drafts'] : []),
    ...(state?.canHistory ? ['Scheduled', 'Outgoing history'] : []),
    ...(state?.canTemplates ? ['Templates'] : []),
    'My notifications',
    ...(state?.owner ? ['Administration'] : []),
  ];
  if (!state && !error) return <p role="status">Loading email workspace…</p>;
  return (
    <section className="max-w-5xl space-y-5" aria-label="Email workspace">
      <div className="flex items-start gap-3">
        <Mail className="mt-1 h-6 w-6 text-blue-300" />
        <div>
          <h2 className="text-lg font-semibold">Email</h2>
          <p className="mt-1 text-sm text-slate-400">
            From Olio &lt;noreply@olio.one&gt;. Replies are not monitored.
          </p>
        </div>
      </div>
      {state && !state.deliveryEnabled && (
        <p
          role="status"
          className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          Delivery is disabled. You can prepare drafts and notification
          preferences while delivery is configured.
        </p>
      )}
      <div
        role="tablist"
        aria-label="Email views"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((name) => (
          <button
            role="tab"
            aria-selected={tab === name}
            key={name}
            className={`${button} ${tab === name ? 'bg-blue-500/20 text-blue-200' : 'text-slate-400'}`}
            onClick={() => {
              setTab(name);
              setPage(0);
              setError('');
              setNotice('');
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        {tab === 'Compose' && (
          <>
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                onClick={() => {
                  setDraft(empty());
                  setAttachments([]);
                  setPreview(null);
                  setLocal('');
                }}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                New message
              </button>
              <span className="self-center text-xs text-slate-500">
                {draft.id
                  ? `Saved draft · revision ${draft.revision}`
                  : 'Unsaved draft'}
              </span>
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-slate-900/40 p-5 sm:p-6">
            <div className="border-b border-white/10 pb-4"><h3 className="text-xl font-semibold">Write your message</h3><p className="mt-1 text-sm text-slate-400">Create, review, then send. Nothing is sent until you confirm.</p></div>
            {!!templates.length && (
              <label className="block text-sm text-slate-400">
                Use a template
                <select
                  className={`${field} mt-1`}
                  value=""
                  onChange={(e) => {
                    const template = templates.find(
                      (item) => item.id === e.target.value,
                    );
                    if (template)
                      change({
                        subject: template.subject,
                        html: template.html,
                      });
                  }}
                >
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm text-slate-400">
              Subject
              <input
                className={`${field} mt-1`}
                maxLength={200}
                value={draft.subject}
                onChange={(e) => change({ subject: e.target.value })}
              />
            </label>
            <EmailEditor disabled={busy}
              value={draft.html}
              onChange={(html) => change({ html })}
            />
            <div className="space-y-2">
              <label className="block text-sm text-slate-400">
                <Paperclip className="mr-1 inline h-4 w-4" />
                Attachments
                <input
                  type="file"
                  className="mt-2 block text-xs"
                  accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.docx,.xlsx,.pptx"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = '';
                    void run(async () => {
                      if (
                        attachments.length + files.length > 5 ||
                        files.some((file) => file.size > 5242880) ||
                        files.reduce(
                          (sum, file) => sum + file.size,
                          attachments.reduce(
                            (sum, file) => sum + (file.size || 0),
                            0,
                          ),
                        ) > 10485760
                      )
                        throw new Error(
                          'Use up to 5 files, 5 MiB each and 10 MiB combined.',
                        );
                      const uploaded = [...attachments];
                      const types: Record<string, string> = {
                        pdf: 'application/pdf',
                        txt: 'text/plain',
                        csv: 'text/csv',
                        png: 'image/png',
                        jpg: 'image/jpeg',
                        jpeg: 'image/jpeg',
                        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                      };
                      for (const file of files) {
                        const mime =
                          types[
                            file.name.split('.').pop()?.toLowerCase() || ''
                          ];
                        const signed = await emailApi('upload', {
                          name: file.name,
                          size: file.size,
                          mime,
                        });
                        const { error } = await supabase.storage
                          .from('email-attachments')
                          .uploadToSignedUrl(signed.path, signed.token, file, {
                            contentType: mime,
                          });
                        if (error) throw new Error('Attachment upload failed.');
                        uploaded.push({
                          id: signed.id,
                          name: signed.name,
                          size: file.size,
                        });
                      }
                      setAttachments(uploaded);
                      change({
                        attachment_ids: uploaded.map((file) => file.id),
                      });
                    });
                  }}
                />
              </label>
              <p className="text-xs text-slate-500">
                PDF, text, CSV, images, or non-macro Office files. Up to 5
                files; 5 MiB each, 10 MiB combined.
              </p>
              {attachments.map((file) => (
                <div key={file.id} className="flex gap-3 text-sm">
                  <button
                    className="text-blue-300"
                    onClick={() =>
                      void run(async () => {
                        const data = await emailApi('download', {
                          id: file.id,
                        });
                        window.location.assign(data.url);
                      })
                    }
                  >
                    {file.name}
                  </button>
                  <button
                    aria-label={`Remove ${file.name}`}
                    onClick={() => {
                      setAttachments(
                        attachments.filter((item) => item.id !== file.id),
                      );
                      change({
                        attachment_ids: draft.attachment_ids.filter(
                          (id) => id !== file.id,
                        ),
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-slate-300">Schedule for later {local ? `· ${local.replace('T', ' ')}` : '(optional)'}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-400">
                Schedule (optional)
                <input
                  type="datetime-local"
                  className={`${field} mt-1`}
                  value={local}
                  onChange={(e) => {
                    setLocal(e.target.value);
                    setPreview(null);
                  }}
                />
              </label>
              <label className="text-sm text-slate-400">
                IANA timezone
                <input
                  className={`${field} mt-1`}
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    setPreview(null);
                  }}
                />
              </label>
              <label className="text-sm text-slate-400">
                Repeated daylight-saving time
                <select
                  className={`${field} mt-1`}
                  value={occurrence}
                  onChange={(e) => {
                    setOccurrence(e.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="reject">Require an unambiguous time</option>
                  <option value="earlier">Earlier occurrence</option>
                  <option value="later">Later occurrence</option>
                </select>
              </label>
            </div>
            </details>
            <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-white/10 bg-slate-900 py-4">
              <button
                className={button}
                onClick={() =>
                  void run(async () => {
                    await save();
                    setPreview(null);
                    setNotice('Draft saved.');
                  })
                }
              >
                Save draft
              </button>
              <button
                className={`${button} bg-blue-500/15`}
                onClick={() =>
                  void run(async () => {
                    setPreviewOpen(true);
                    setPreview(null);
                    const saved = await save();
                    setPreview(
                      await emailApi('preview', {
                        id: saved.id,
                        revision: saved.revision,
                        local,
                        timezone,
                        occurrence,
                      }),
                    );
                    setKey(crypto.randomUUID());
                  })
                }
              >
                {busy ? 'Preparing…' : `Preview ${local ? 'scheduled email' : 'email'}`}
              </button>
            </div>
            </div>
            <EmailRecipients value={draft.recipients} onChange={recipients => change({ recipients })} disabled={busy} />
            </div>
            {previewOpen && (
              <EmailPreviewDialog busy={busy} onClose={() => { setPreviewOpen(false); setPreview(null); }}>
              {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">{error}</p>}
              {busy && !preview && <p role="status">Preparing your preview…</p>}
              {!busy && !preview && !error && <p role="status">This preview is no longer current. Return to editing and preview the message again.</p>}
              {preview && (
              <section
                aria-label="Confirm email"
                className="space-y-4 rounded-xl border border-blue-400/30 bg-blue-500/5 p-5"
              >
                <h3 className="font-semibold">Review and confirm</h3>
                <p className="text-sm">
                  {preview.recipients.length} recipients ·{' '}
                  {preview.attachmentCount} attachments ·{' '}
                  {local
                    ? `${new Date(preview.scheduled_at).toLocaleString('en-US', { timeZone: preview.timezone })} (${preview.timezone})`
                    : 'Send as soon as the queue is processed'}
                </p>
                <p className="break-words text-sm text-slate-400">
                  {preview.recipients.join(', ')}
                </p>
                <h4 className="font-medium">{preview.subject}</h4>
                <div
                  className="rounded-lg bg-white p-4 text-slate-900 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-6 [&_a]:text-blue-700"
                  dangerouslySetInnerHTML={{ __html: preview.html }}
                />
                <button
                  disabled={busy || !state?.deliveryEnabled}
                  className={`${button} bg-blue-600`}
                  onClick={() =>
                    void run(async () => {
                      await emailApi('submit', {
                        token: preview.token,
                        key,
                        confirmation: 'SEND',
                      });
                      setDrafts(current => current.filter(item => item.id !== draft.id));
                      setDraft(empty());
                      setAttachments([]);
                      setPreview(null);
                      setPreviewOpen(false);
                      if (state?.canHistory) { setGlobal(false); setPage(0); setTab('Outgoing history'); }
                      setNotice(
                        'Email queued. Outgoing history shows each recipient’s result.',
                      );
                    })
                  }
                >
                  <Send className="mr-2 inline h-4 w-4" />
                  Confirm {local ? 'schedule' : 'send'}
                </button>
              </section>
              )}
              </EmailPreviewDialog>
            )}
          </>
        )}
        {tab === 'Drafts' && (
          <div className="space-y-3">
            {!drafts.length && (
              <p className="text-slate-400">No saved drafts.</p>
            )}
            {drafts.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-4"
              >
                <span className="flex-1">
                  {item.subject || 'Untitled draft'}
                </span>
                <button
                  className={button}
                  onClick={() => void run(() => openDraft(item))}
                >
                  Edit
                </button>
                <button
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      await openDraft({ ...item, id: '', revision: 0 });
                      setNotice('Copy opened. Save it to create a new draft.');
                    })
                  }
                >
                  Duplicate
                </button>
                <button
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (!window.confirm('Delete this draft?')) return;
                      await emailApi('delete-draft', { id: item.id });
                      await loadTab();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        {(tab === 'Scheduled' || tab === 'Outgoing history') && (
          <>
            <section aria-label="Delivery progress" className="space-y-2 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
              {linkedJob && <button className={button} onClick={() => { setLinkedJob(''); const url = new URL(window.location.href); url.searchParams.delete('emailJob'); window.history.replaceState(null, '', url); }}>Show all messages</button>}
              <h3 className="font-medium">Delivery progress</h3>
              <p className="text-xs text-slate-400">Updates every 5 seconds while this page is visible. Last checked: {checkedAt ? new Date(checkedAt).toLocaleTimeString() : 'Checking…'}</p>
              {state?.owner && health && <>
                <p className="text-sm">{!state.deliveryEnabled ? 'Delivery is disabled in this deployment.' : health.paused ? `Sending paused: ${health.error_code || 'check SMTP configuration'}.` : health.worker_until && Date.parse(health.worker_until) > Date.now() ? 'Worker lease is active. It may be processing the queue.' : 'Worker is idle.'}</p>
                <p className="text-sm text-slate-300">Last worker pickup: {health.last_dispatch_at ? new Date(health.last_dispatch_at).toLocaleString() : 'Never'}</p>
                {(!health.last_dispatch_at || Date.now() - Date.parse(health.last_dispatch_at) > 180000) && <p className="text-sm text-amber-200">No recent worker pickup. Check that the Supabase cron job is active and its dispatch URL and secret match Vercel. Queuing a message does not start the worker.</p>}
              </>}
              <p className="text-xs text-slate-400">Queued → sending → accepted by mail server. Retry means another attempt is scheduled; unknown means acceptance could not be confirmed.</p>
            </section>
            {state?.owner && (
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={global}
                  onChange={(e) => {
                    setGlobal(e.target.checked);
                    setPage(0);
                  }}
                />
                All admins’ outgoing email
              </label>
            )}
            <p className="text-xs text-slate-400">
              SMTP acceptance means the mail server accepted the message.
              Delivery and reading are not tracked.
            </p>
            {messages
              .filter(
                (message) =>
                  tab !== 'Scheduled' ||
                  message.email_jobs.some((job) =>
                    ['scheduled', 'queued', 'retry'].includes(job.status),
                  ),
              )
              .map((message) => (
                <article
                  key={message.id}
                  className="space-y-3 rounded-xl border border-white/10 p-4"
                >
                  <h3 className="font-medium">{message.subject}</h3>
                  <p className="text-xs text-slate-400">
                    {new Date(message.scheduled_at).toLocaleString()} ·{' '}
                    {message.timezone}
                  </p>
                  <ul className="space-y-2">
                    {message.email_jobs.map((job) => (
                      <li
                        key={job.id}
                        className="flex flex-wrap items-center gap-3 text-sm"
                      >
                        <span className="min-w-0 flex-1 break-all">
                          {job.recipient}
                        </span>
                        <span>{deliveryLabels[job.status]}</span>
                        <span className="text-xs text-slate-400">{job.attempts} sending attempt{job.attempts === 1 ? '' : 's'}</span>
                        {job.available_at && ['queued', 'scheduled', 'retry'].includes(job.status) && <span className="text-xs text-slate-400">Eligible from {new Date(job.available_at).toLocaleString()}</span>}
                        <details className="w-full rounded-lg bg-white/5 p-3">
                          <summary className="cursor-pointer text-xs text-blue-200">View processing history</summary>
                          <p className="mt-2 break-all text-xs text-slate-500">Job ID: {job.id}</p>
                          {!job.email_attempts?.length ? <p className="mt-2 text-xs text-slate-400">No sending attempt recorded. The message has not reached the sending stage.</p> : <ol className="mt-2 space-y-2">{[...job.email_attempts].sort((a, b) => a.attempt - b.attempt).map(attempt => <li key={attempt.attempt} className="text-xs text-slate-300">Attempt {attempt.attempt} started {new Date(attempt.created_at).toLocaleString()} · {deliveryLabels[attempt.status] || attempt.status}{attempt.error_code ? ` · ${attempt.error_code}` : ''}</li>)}</ol>}
                        </details>
                        {job.completed_at && (
                          <time className="text-xs text-slate-500">
                            {new Date(job.completed_at).toLocaleString()}
                          </time>
                        )}
                        {job.error_code && (
                          <span className="text-xs text-amber-200">
                            {job.error_code.replace(/_/g, ' ')}
                          </span>
                        )}
                        {!global &&
                          state?.canSend &&
                          ['failed', 'unknown'].includes(job.status) && (
                            <button
                              className={button}
                              onClick={() =>
                                void run(async () => {
                                  if (
                                    !window.confirm(
                                      job.status === 'unknown'
                                        ? 'The server may already have accepted this email. Retrying can send a duplicate. Retry anyway?'
                                        : 'Retry this recipient?',
                                    )
                                  )
                                    return;
                                  await emailApi('retry', {
                                    id: job.id,
                                    confirmUnknown: job.status === 'unknown',
                                  });
                                  await loadTab();
                                })
                              }
                            >
                              Retry
                            </button>
                          )}
                      </li>
                    ))}
                  </ul>
                  {!global &&
                    state?.canSend &&
                    message.email_jobs.some((job) =>
                      ['scheduled', 'queued', 'retry'].includes(job.status),
                    ) && (
                      <div className="flex gap-2">
                        <button
                          className={button}
                          onClick={() =>
                            void run(async () => {
                              if (
                                !window.confirm(
                                  'Cancel recipients that have not started sending?',
                                )
                              )
                                return;
                              await emailApi('cancel', { id: message.id });
                              await loadTab();
                            })
                          }
                        >
                          Cancel remaining
                        </button>
                        {message.email_jobs.every(
                          (job) => job.attempts === 0,
                        ) && (
                          <button
                            className={button}
                            onClick={() =>
                              void run(async () => {
                                await emailApi('cancel', {
                                  id: message.id,
                                  toDraft: true,
                                });
                                setTab('Drafts');
                              })
                            }
                          >
                            Return to draft
                          </button>
                        )}
                      </div>
                    )}
                </article>
              ))}
            {tab === 'Outgoing history' && systemMessages.length > 0 && (
              <section className="space-y-3 rounded-xl border border-white/10 p-4">
                <h3 className="font-medium">
                  Authentication and automatic messages
                </h3>
                {systemMessages.map((job) => (
                  <div key={job.id} className="flex flex-wrap gap-3 text-sm">
                    <span className="flex-1 break-all">{job.recipient}</span>
                    <span className="text-slate-400">{job.kind}</span>
                    <span>{deliveryLabels[job.status]}</span>
                    <time className="text-xs text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
                    </time>
                    {job.error_code && (
                      <span className="text-xs text-amber-200">
                        {job.error_code}
                      </span>
                    )}
                  </div>
                ))}
              </section>
            )}
            {!messages.length && !systemMessages.length && (
              <p className="text-slate-400">No outgoing messages.</p>
            )}
            <div className="flex gap-2">
              <button
                className={button}
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="self-center text-sm">Page {page + 1}</span>
              <button
                className={button}
                disabled={messages.length < 25 && systemMessages.length < 25}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
              <button className={button} onClick={() => void run(loadTab)}>
                Refresh results
              </button>
            </div>
          </>
        )}
        {tab === 'Templates' && (
          <>
            <div className="flex flex-wrap gap-2">
              {templates.map((item) => (
                <button
                  key={item.id}
                  className={button}
                  onClick={() => {
                    setTemplateId(item.id);
                    setTemplateName(item.name);
                    setShared(item.shared);
                    setTemplateContent({
                      subject: item.subject,
                      html: item.html,
                    });
                  }}
                >
                  {item.name}
                  {item.shared ? ' · Shared' : ''}
                </button>
              ))}
              <button
                className={button}
                onClick={() => {
                  setTemplateId('');
                  setTemplateName('');
                  setShared(false);
                  setTemplateContent({ subject: '', html: '' });
                }}
              >
                New template
              </button>
            </div>
            <label className="block text-sm">
              Template name
              <input
                className={field}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                maxLength={100}
              />
            </label>
            <label className="block text-sm">
              Subject
              <input
                className={field}
                value={templateContent.subject}
                onChange={(e) =>
                  setTemplateContent({
                    ...templateContent,
                    subject: e.target.value,
                  })
                }
                maxLength={200}
              />
            </label>
            <EmailEditor disabled={busy}
              value={templateContent.html}
              onChange={(html) =>
                setTemplateContent({ ...templateContent, html })
              }
            />
            {state?.owner && (
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shared}
                  onChange={(e) => setShared(e.target.checked)}
                />
                Shared template
              </label>
            )}
            <div className="flex gap-2">
              <button
                className={button}
                disabled={shared && !state?.owner}
                onClick={() =>
                  void run(async () => {
                    const data = await emailApi('save-template', {
                      id: templateId || undefined,
                      name: templateName,
                      subject: templateContent.subject,
                      html: templateContent.html,
                      shared,
                    });
                    setTemplateId(data.template.id);
                    await loadTab();
                    setNotice('Template saved.');
                  })
                }
              >
                Save template
              </button>
              {templateId && (
                <button
                  className={button}
                  disabled={shared && !state?.owner}
                  onClick={() =>
                    void run(async () => {
                      if (!window.confirm('Delete this template?')) return;
                      await emailApi('delete-template', { id: templateId });
                      setTemplateId('');
                      await loadTab();
                    })
                  }
                >
                  Delete template
                </button>
              )}
            </div>
          </>
        )}
        {(tab === 'My notifications' ||
          (tab === 'Administration' && admin)) && (
          <div className="space-y-4 rounded-xl border border-white/10 p-4">
            <h3 className="font-medium">
              {tab === 'Administration'
                ? 'Selected admin’s notifications'
                : 'My notifications'}
            </h3>
            <p className="text-sm text-slate-400">
              Notifications are off by default and go to the current verified
              account email. Owners receive global failure alerts; other admins
              receive their own. Each admin can change their preferences.
            </p>
            {emailEvents.map((event) => (
              <label key={event} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={preferences[event]}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      [event]: e.target.checked,
                    })
                  }
                />
                {labels[event]}
              </label>
            ))}
            <button
              className={button}
              onClick={() =>
                void run(async () => {
                  await emailApi('preferences', {
                    ...preferences,
                  });
                  await loadTab();
                  setNotice('Notification preferences saved.');
                })
              }
            >
              Save preferences
            </button>
          </div>
        )}
        {tab === 'Administration' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="font-medium">Delivery health</h3>
              <p className="mt-2 text-sm text-slate-400">
                {health?.paused
                  ? 'Paused: check SMTP configuration.'
                  : 'Dispatcher ready.'}{' '}
                Last invocation:{' '}
                {health?.last_dispatch_at
                  ? new Date(health.last_dispatch_at).toLocaleString()
                  : 'Never'}
              </p>
              {health?.paused && (
                <button
                  className={`${button} mt-3`}
                  onClick={() =>
                    void run(async () => {
                      await emailApi('resume');
                      await loadTab();
                    })
                  }
                >
                  Resume after correcting configuration
                </button>
              )}
            </div>
            <label className="block text-sm">
              Manage an admin
              <select
                className={`${field} mt-1`}
                value={admin}
                onChange={(e) => {
                  setAdmin(e.target.value);
                  setSelectedPreferences(
                    adminPreferences.find(
                      (pref) => pref.user_id === e.target.value,
                    ) || defaults,
                  );
                }}
              >
                <option value="">Choose admin</option>
                {admins.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.email}
                    {item.app_owner ? ' (owner)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {admin && (
              <section aria-label="Selected admin notification preferences" className="space-y-4 rounded-xl border border-white/10 p-4">
                <h3 className="font-medium">Notifications for {admins.find(item => item.id === admin)?.email}</h3>
                <p className="text-sm text-slate-400">Choose the emails this admin receives at their verified account address. These settings do not grant permission to send email.</p>
                {emailEvents.map(event => <label key={event} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={selectedPreferences[event]} onChange={e => setSelectedPreferences(current => ({ ...current, [event]: e.target.checked }))} />
                  {labels[event]}
                </label>)}
                <button className={button} onClick={() => void run(async () => {
                  await emailApi('preferences', { ...selectedPreferences, user_id: admin });
                  await loadTab();
                  setNotice('Admin notification preferences saved.');
                })}>Save admin preferences</button>
              </section>
            )}
            {admin && !admins.find(item => item.id === admin)?.app_owner && (
              <a
                className="inline-block text-sm text-blue-300 underline"
                href={`/admin?section=people&account=${encodeURIComponent(admin)}`}
              >
                Open account management for sending permissions
              </a>
            )}
            <p className="text-xs text-slate-500">
              Grant Email access explicitly through the existing owner-reviewed
              permissions editor. Existing admins are not automatically granted
              sending access.
            </p>
          </div>
        )}
      </fieldset>
      {busy && (
        <p role="status" className="text-sm text-slate-400">
          Working…
        </p>
      )}
    </section>
  );
}
