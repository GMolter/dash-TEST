import { useEffect, useState } from 'react';
import { MessageCircleQuestion, FileText, BookOpenText, ArrowRight, Home, ChevronDown } from 'lucide-react';

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
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-left"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-700/60">
          <p className="text-sm text-slate-300 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function HelpPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/public/help-articles', { cache: 'no-store' });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setArticles([]);
          setError(j.error || 'Could not load documentation.');
          return;
        }
        setArticles(Array.isArray(j.articles) ? j.articles : []);
        setError(null);
      } catch {
        if (!cancelled) {
          setArticles([]);
          setError('Could not load documentation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60">
              <BookOpenText className="h-4 w-4 text-slate-200" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">Help Center</h1>
              <p className="text-xs text-slate-400 leading-tight">Find answers, guides, and platform documentation.</p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </a>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircleQuestion className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Q&amp;A</h2>
            </div>
            <div className="space-y-2">
              {QA_ITEMS.map((item) => (
                <QAItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>

          <section className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Docs</h2>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
                Loading documentation...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : articles.length ? (
              <div className="space-y-2">
                {articles.map((article) => (
                  <a
                    key={article.id}
                    href={`/help/article/${article.slug}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 hover:bg-slate-800/60 hover:border-slate-600 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{article.title}</div>
                      <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                        {article.summary || 'No summary provided.'}
                      </p>
                      <div className="text-xs text-slate-500 mt-1.5">
                        Updated {new Date(article.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-none text-slate-500 mt-0.5" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
                Documentation has not been published yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
