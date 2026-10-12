import { useState } from 'react';
import { Activity, ArrowRight, BookOpenText, Building2, Database, Lightbulb, Megaphone, Plug, Search, ShieldCheck, Users, X } from 'lucide-react';
import type { AdminOverview } from './types';

const DESTINATION_GROUPS = [
  {
    title: 'People & access', description: 'Support the people using Olio.', accent: 'text-sky-300 bg-sky-400/10',
    items: [
      { key: 'people', title: 'People', detail: 'Accounts, permissions, and personal settings.', keywords: 'users roles password bans', icon: Users },
      { key: 'organizations', title: 'Organizations', detail: 'Teams, membership, and ownership.', keywords: 'members join codes', icon: Building2 },
      { key: 'reviews', title: 'Pending reviews', detail: 'Review access and account deletion requests.', keywords: 'approve approvals admin', icon: ShieldCheck },
    ],
  },
  {
    title: 'Content & communication', description: 'Keep everyone informed and supported.', accent: 'text-violet-300 bg-violet-400/10',
    items: [
      { key: 'banner', title: 'Banners', detail: 'Announcements and scheduled messages.', keywords: 'alerts updates', icon: Megaphone },
      { key: 'platform', title: 'Help Center', detail: 'Help articles and product guidance.', keywords: 'documentation support', icon: BookOpenText },
      { key: 'features', title: 'New features', detail: 'Feature ideas and development plans.', keywords: 'roadmap feedback planning', icon: Lightbulb },
    ],
  },
  {
    title: 'Workspace & operations', description: 'Manage the tools behind the workspace.', accent: 'text-teal-300 bg-teal-400/10',
    items: [
      { key: 'workspace', title: 'Workspace data', detail: 'Browse saved content and workspace records.', keywords: 'projects pastes links quicklinks secrets tasks', icon: Database },
      { key: 'integrations', title: 'Integrations', detail: 'Connected plugins and launcher devices.', keywords: 'pairings connections classdash', icon: Plug },
      { key: 'audit', title: 'Activity', detail: 'Review administrative changes and history.', keywords: 'audit log events', icon: Activity },
    ],
  },
];

export function AdminOverviewPage({ overview, onNavigate, allowedSections }: {
  overview: AdminOverview | null;
  onNavigate: (section: string) => void;
  allowedSections: string[];
}) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const groups = DESTINATION_GROUPS.map(group => ({ ...group, items: group.items.filter(item =>
    allowedSections.includes(item.key) && (item.key !== 'reviews' || overview?.isOwner) &&
    `${group.title} ${item.title} ${item.detail} ${item.keywords}`.toLowerCase().includes(search),
  ) })).filter(group => group.items.length);
  const pendingReviews = overview?.isOwner && allowedSections.includes('reviews') ? overview.metrics.pendingAdminReviews || 0 : 0;

  return <div className="mx-auto max-w-6xl pb-8">
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/80 via-slate-900/70 to-blue-950/40 px-6 py-9 sm:px-10 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border border-blue-300/10 bg-blue-400/[0.03]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-16 h-64 w-64 rounded-full border border-blue-300/10" />
      <div className="relative max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">Olio administration</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Where would you like to go?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">Find the right place to manage, support, and improve Olio.</p>
        <div className="mt-7 flex items-center gap-3 rounded-xl border border-white/15 bg-slate-950/60 px-4 shadow-lg shadow-black/10 focus-within:border-blue-400/60 focus-within:ring-2 focus-within:ring-blue-400/20">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500" />
          <input type="search" aria-label="Find an admin destination" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a destination, like people or banners…" className="min-w-0 flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear destination search" className="rounded-md p-1 text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"><X className="h-4 w-4" /></button>}
        </div>
      </div>
    </section>

    {pendingReviews > 0 && <button type="button" onClick={() => onNavigate('reviews')} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-5 py-4 text-left text-sm text-amber-100 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
      <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-300" />
      <span className="flex-1">{pendingReviews} account request{pendingReviews === 1 ? '' : 's'} awaiting review</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
    </button>}

    <nav aria-label="Admin destinations" className="mt-9">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-slate-200">{search ? 'Matching destinations' : 'Explore your workspace'}</h2>
        <span className="text-xs text-slate-500">Choose an area to get started</span>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {groups.map(group => <section key={group.title} aria-label={group.title} className="min-w-0">
          <div className="mb-4 border-t border-white/10 pt-5">
            <h3 className="text-sm font-semibold text-slate-200">{group.title}</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{group.description}</p>
          </div>
          <div className="space-y-2">{group.items.map(item => <button key={item.key} type="button" onClick={() => onNavigate(item.key)} className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/[0.025] p-4 text-left transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${group.accent}`}><item.icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-100">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{item.detail}</span></span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-slate-200" />
          </button>)}</div>
        </section>)}
      </div>
      {!groups.length && <div role="status" className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
        <p className="text-sm text-slate-200">{search ? 'No destinations found.' : 'No admin destinations are available for your access.'}</p>
        <p className="mt-2 text-sm text-slate-500">{search ? 'Try another name or task, such as accounts or announcements.' : 'Contact an application owner if you need additional permissions.'}</p>
      </div>}
    </nav>
  </div>;
}
