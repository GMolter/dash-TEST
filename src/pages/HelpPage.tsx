import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Home, ChevronDown, Search, ArrowRight } from 'lucide-react';

type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  updated_at: string;
};

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
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left transition-colors group"
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
        // silent — search just won't return results
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return [];
    return articles.filter((a) =>
      `${a.title} ${a.summary}`.toLowerCase().includes(query)
    );
  }, [articles, query]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-4">
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

      <div className="max-w-2xl mx-auto px-4 py-16 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-white">How can we help?</h1>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Search results */}
        {query && (
          <div className="space-y-1.5">
            {loading ? (
              <p className="text-sm text-slate-500 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center">No articles match your search.</p>
            ) : (
              filtered.map((article) => (
                <a
                  key={article.id}
                  href={`/help/article/${article.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 hover:bg-slate-800/60 hover:border-slate-700 transition-colors"
                >
                  <span className="text-sm text-white">{article.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 flex-none text-slate-600" />
                </a>
              ))
            )}
          </div>
        )}

        {/* Common Questions — shown when not searching */}
        {!query && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 pb-2">Common Questions</p>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4">
              {QA_ITEMS.map((item) => (
                <QAItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
