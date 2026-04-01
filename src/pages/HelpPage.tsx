import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Home, ChevronDown, Search, ArrowRight, Users, Link2, Shield, EyeOff } from 'lucide-react';

type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  updated_at: string;
};

const TOPIC_TILES = [
  { icon: Users, label: 'Organizations', sub: 'Joining, leaving, and managing teams' },
  { icon: Link2, label: 'URL Shortener', sub: 'Shorten and manage links' },
  { icon: EyeOff, label: 'Secret Sharing', sub: 'One-time encrypted secrets' },
  { icon: Shield, label: 'Security & Access', sub: 'Invite codes, roles, and permissions' },
];

const QA_ITEMS = [
  {
    q: 'How do I join an organization?',
    a: "On the Organization Setup screen, select Join Organization, enter the 4-digit invite code from your team, and click Join. You'll be added as a Member immediately.",
  },
  {
    q: 'Can I belong to multiple organizations at once?',
    a: "No. Each account belongs to exactly one organization at a time. You must leave your current org before joining another.",
  },
  {
    q: 'What happens if I leave my organization?',
    a: "Leaving is immediate. You'll be returned to the Organization Setup screen and will need a new invite code to re-join. Personal data (like personal Quick Links) stays with your account.",
  },
  {
    q: 'How do I create a one-time secret link?',
    a: "Go to Utilities → Secret Sharing, enter your content, and generate a link. The secret can only be viewed once — after that it's permanently destroyed.",
  },
  {
    q: 'How do I shorten a URL?',
    a: "Go to Utilities → URL Shortener, paste your long URL, optionally set a custom short code, and click Shorten. The link is scoped to your organization.",
  },
  {
    q: 'How do I regenerate my organization invite code?',
    a: "Go to Organization → Manage (requires Owner or Admin role) and click Regenerate under the Security section. The old code will stop working immediately.",
  },
];

function QAItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-4 text-left group"
      >
        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{q}</span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-slate-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function HelpPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/public/help-articles', { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled) setArticles(Array.isArray(j.articles) ? j.articles : []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const query = search.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    if (!query) return articles;
    return articles.filter((a) =>
      `${a.title} ${a.summary}`.toLowerCase().includes(query)
    );
  }, [articles, query]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-20 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <div className="flex items-center gap-2.5">
            <BookOpenText className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Help Center</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Articles</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="text-xs text-slate-600 px-2 py-2">Loading...</p>
            ) : articles.length === 0 ? (
              <p className="text-xs text-slate-600 px-2 py-2">No articles yet.</p>
            ) : filteredArticles.length === 0 ? (
              <p className="text-xs text-slate-600 px-2 py-2">No articles match.</p>
            ) : (
              filteredArticles.map((article) => (
                <a
                  key={article.id}
                  href={`/help/article/${article.slug}`}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors group"
                >
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-700 group-hover:text-slate-500 transition-colors" />
                  <span className="truncate">{article.title}</span>
                </a>
              ))
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">

          {/* Hero */}
          <div className="border-b border-slate-800 bg-slate-900/20 px-10 py-14">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white tracking-tight">How can we help?</h1>
                <p className="text-slate-400 text-base">Search the docs or browse common questions below.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Content below hero */}
          <div className="px-10 py-10">
            <div className="max-w-2xl mx-auto space-y-12">

              {/* Topic tiles — hide when searching */}
              {!query && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Topics</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TOPIC_TILES.map(({ icon: Icon, label, sub }) => (
                      <div
                        key={label}
                        className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                      >
                        <div className="mt-0.5 rounded-lg border border-slate-700 bg-slate-800 p-2">
                          <Icon className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Q&A */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Common Questions</p>
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-5">
                  {QA_ITEMS.map((item) => (
                    <QAItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
