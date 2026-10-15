import { useCallback, useEffect, useRef, useState } from 'react';
import { categories, listTickets, loadTicket, markRead, mutateTicket, type Category, type Mutation, type Ticket } from './api';
import { useSupportRefresh } from './useSupportRefresh';
import { RequesterSummary } from './RequesterSummary';

const field = 'mt-2 w-full rounded-xl border border-white/20 bg-slate-900 p-3 text-white';
const button = 'rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50';
const panel = 'rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-7';
const date = (value: string) => new Date(value).toLocaleString();
const ticketUrl = (admin: boolean, id?: string) => `${admin ? '/admin?section=support' : '/support'}${id ? `${admin ? '&' : '?'}ticket=${encodeURIComponent(id)}` : ''}`;

// Retain the request identifier when retrying the same operation after a lost response.
function useMutation() {
  const attempt = useRef<{ key: string; request: string }>();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (input: Omit<Mutation, 'request'>, success: (id: string) => void) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    const key = JSON.stringify(input);
    if (attempt.current?.key !== key) attempt.current = { key, request: crypto.randomUUID() };
    try {
      const id = await mutateTicket({ ...input, request: attempt.current.request });
      attempt.current = undefined; success(id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { running.current = false; setBusy(false); }
  };
  return { busy, error, run };
}

function NewTicket({ onCreated }: { onCreated: (id: string) => void }) {
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const { busy, error, run } = useMutation();
  return <form className={panel} onSubmit={event => {
    event.preventDefault();
    if (category && description.trim()) void run({ action: 'created', category, body: description.trim() }, onCreated);
  }}>
    <h2 className="text-xl font-semibold">How can we help?</h2>
    <p className="mt-2 text-sm text-slate-300">Choose a problem and tell us what happened. Please don’t include passwords or other secrets.</p>
    {error && <p role="alert" className="mt-4 text-rose-300">{error}</p>}
    <fieldset disabled={busy} className="mt-5 space-y-5">
      <label className="block">Problem<select required className={field} value={category} onChange={e => setCategory(e.target.value as Category)}><option value="">Select a problem</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block">Description<textarea required maxLength={5000} rows={6} className={field} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <p className="text-xs text-slate-400">{description.length.toLocaleString()} / 5,000 characters</p>
      <button className={`${button} bg-violet-600`} disabled={!category || !description.trim()}>{busy ? 'Submitting…' : 'Submit ticket'}</button>
    </fieldset>
  </form>;
}

function TicketDetail({ id, admin, refreshVersion }: { id: string; admin: boolean; refreshVersion: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadTicket>>>();
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [reply, setReply] = useState('');
  const generation = useRef(0);
  const mutation = useMutation();
  const refresh = useCallback(async () => {
    const request = generation.current + 1;
    generation.current = request;
    try {
      const next = await loadTicket(id, admin);
      if (request === generation.current) { setData(next); setError(''); }
    } catch (e) { if (request === generation.current) { setError(e instanceof Error ? e.message : 'Unable to load ticket.'); setData(undefined); } }
  }, [id, admin]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh, refreshVersion]);
  useSupportRefresh(refresh);
  // Runs after the snapshot has rendered. Never mark a newer revision read.
  useEffect(() => {
    if (!data) return;
    let active = true;
    const read = () => {
      if (document.visibilityState === 'hidden') return;
      void markRead(id, data.ticket.revision).then(() => { if (active) setReadError(''); }).catch(() => { if (active) setReadError('Could not update the unread indicator. It will retry when this ticket refreshes.'); });
    };
    read(); document.addEventListener('visibilitychange', read);
    return () => { active = false; document.removeEventListener('visibilitychange', read); };
  }, [id, data]);
  if (error) return <div className={panel}><p role="alert">{error}</p><button className={`${button} mt-4`} onClick={() => { void refresh(); }}>Try again</button></div>;
  if (!data) return <p role="status">Loading ticket…</p>;
  const { ticket, events } = data;
  return <section className={`${panel} space-y-6`} aria-label={`Support ticket ${ticket.reference}`}>
    <header className="flex flex-wrap items-start justify-between gap-4"><div>
      <p className="text-sm text-violet-300">Ticket #{ticket.reference} · {ticket.status === 'open' ? 'Open' : 'Completed'}</p>
      <h2 className="mt-2 text-2xl font-semibold">{categories[ticket.category]}</h2>
      <p className="mt-2 text-sm text-slate-400">{ticket.requester} · {date(ticket.created_at)}</p>
    </div>{admin && <button className={button} disabled={mutation.busy} onClick={() => { void mutation.run({ action: ticket.status === 'open' ? 'completed' : 'reopened', ticket: id }, () => { void refresh(); }); }}>{ticket.status === 'open' ? 'Mark completed' : 'Reopen ticket'}</button>}</header>
    {admin && <RequesterSummary key={ticket.user_id} userId={ticket.user_id} fallbackName={ticket.requester} />}
    <div><h3 className="font-medium">Original description</h3><p className="mt-2 whitespace-pre-wrap break-words text-slate-200">{ticket.description}</p></div>
    <ol aria-label="Conversation" className="space-y-4">{events.filter(event => event.kind !== 'created').map(event => <li key={event.id} className="rounded-xl border border-white/10 p-4">
      <p className="text-sm font-medium">{event.author}{event.admin ? ' · Admin' : ' · Requester'} <time className="ml-2 font-normal text-slate-400" dateTime={event.created_at}>{date(event.created_at)}</time></p>
      <p className="mt-2 whitespace-pre-wrap break-words">{event.kind === 'reply' ? event.body : event.kind === 'completed' ? 'Marked the ticket completed.' : 'Reopened the ticket.'}</p>
    </li>)}</ol>
    {readError && <p role="status" className="text-sm text-amber-200">{readError}</p>}
    {mutation.error && <p role="alert" className="text-rose-300">{mutation.error}</p>}
    <form onSubmit={event => { event.preventDefault(); if (reply.trim()) void mutation.run({ action: 'reply', ticket: id, body: reply.trim() }, () => { setReply(''); void refresh(); }); }}>
      <fieldset disabled={mutation.busy || ticket.status === 'completed'}>
        <label className="block">Reply<textarea rows={4} required maxLength={5000} className={field} value={reply} onChange={e => setReply(e.target.value)} /></label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">{reply.length.toLocaleString()} / 5,000 characters</p><button className={`${button} bg-violet-600`} disabled={!reply.trim()}>{mutation.busy ? 'Saving…' : 'Send reply'}</button></div>
      </fieldset>
      {ticket.status === 'completed' && <p className="mt-3 text-sm text-slate-300">This ticket is completed. An admin can reopen it if needed.</p>}
    </form>
  </section>;
}

export function SupportPage({ admin = false, refreshVersion = 0 }: { admin?: boolean; refreshVersion?: number }) {
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('ticket'));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string>();
  const [status, setStatus] = useState<'open' | 'completed'>('open');
  const [page, setPage] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = generation.current + 1;
    generation.current = request;
    try {
      const next = await listTickets(admin, status, page * 25);
      if (request === generation.current) { setTickets(next.tickets); setTotal(next.total); setError(''); }
    } catch (e) { if (request === generation.current) setError(e instanceof Error ? e.message : 'Unable to load tickets.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [admin, status, page]);
  useEffect(() => { setLoading(true); void refresh(); return () => { generation.current++; }; }, [refresh, refreshVersion]);
  useSupportRefresh(refresh, true);
  useEffect(() => {
    const back = () => { setSelected(new URLSearchParams(window.location.search).get('ticket')); setCreating(false); };
    window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back);
  }, []);
  const select = (id?: string) => {
    window.history.pushState({}, '', ticketUrl(admin, id)); setSelected(id ?? null); setCreating(false);
  };
  const Container = admin ? 'section' : 'main';
  const Heading = admin ? 'h2' : 'h1';
  return <Container className={admin ? 'space-y-6' : 'relative z-10 mx-auto min-h-screen max-w-4xl space-y-6 px-5 pb-16 pt-28 text-white'}>
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-violet-300">Olio support</p><Heading className="mt-2 text-3xl font-semibold">{admin ? 'Support inbox' : 'Contact support'}</Heading><p className="mt-2 text-slate-300">{admin ? 'Help people across Olio Workstation.' : 'Get help and follow your open and completed tickets.'}</p></div>
      {!admin && <button className={`${button} bg-violet-600`} onClick={() => { setCreating(true); setSelected(null); }}>New ticket</button>}
    </header>
    {created && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4"><p>Your support ticket has been submitted. An admin will be in contact shortly.</p><a className="mt-2 inline-block underline" href={ticketUrl(admin, created)} onClick={e => { e.preventDefault(); select(created); }}>View ticket</a></div>}
    {(selected || creating) && <button className={button} onClick={() => select()}>Back to tickets</button>}
    {creating ? <NewTicket onCreated={id => { setCreated(id); setCreating(false); select(id); void refresh(); }} /> : selected ? <TicketDetail key={`${admin}:${selected}`} id={selected} admin={admin} refreshVersion={refreshVersion} /> : <>
      <div className="flex flex-wrap gap-3" aria-label="Ticket status">{(['open', 'completed'] as const).map(value => <button key={value} className={`${button} ${status === value ? 'bg-violet-600' : ''}`} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(0); }}>{value === 'open' ? 'Open' : 'Completed'}</button>)}<button className={`${button} ml-auto`} onClick={() => { void refresh(); }}>Refresh</button></div>
      {error ? <p role="alert" className="text-rose-300">{error} Use Refresh to try again.</p> : loading ? <p role="status">Loading tickets…</p> : tickets.length === 0 ? <div className={panel}><h2 className="font-semibold">No {status} tickets</h2><p className="mt-2 text-slate-400">{admin ? 'Tickets will appear here when users contact support.' : 'Need a hand? Select New ticket to contact an admin.'}</p></div> : <ul className="space-y-3">{tickets.map(ticket => <li key={ticket.id}><a href={ticketUrl(admin, ticket.id)} onClick={e => { e.preventDefault(); select(ticket.id); }} className={`${panel} block hover:border-violet-400/50`}>
        <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">#{ticket.reference} · {categories[ticket.category]}</span>{ticket.unread && <span className="rounded-full bg-violet-500/20 px-2 text-sm text-violet-200">Unread</span>}</div>
        {admin && <p className="mt-2 break-words text-sm">{ticket.requester}</p>}<p className="mt-2 text-sm text-slate-400">{ticket.status === 'open' ? 'Open' : 'Completed'} · Last activity {date(ticket.updated_at)}</p>
      </a></li>)}</ul>}
      {total > 25 && <nav aria-label="Ticket pages" className="flex items-center gap-4"><button className={button} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(total / 25)}</span><button className={button} disabled={(page + 1) * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </Container>;
}
