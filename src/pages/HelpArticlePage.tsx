import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { LinkedContent } from '../components/linking/renderLinkedContent';
import type { LinkResolvedMeta } from '../components/linking/types';
import type { ParsedMarkdownLink } from '../lib/linking';
import { extractArticleAnchors } from '../lib/helpArticleFormatting';

type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  updated_at: string;
};

type HelpLinkRef = {
  id: string;
  slug: string;
  title: string;
};

export function HelpArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [helpRefs, setHelpRefs] = useState<HelpLinkRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);

    async function load() {
      try {
        const r = await fetch(`/api/public/help-article?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (r.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }
        const j = await r.json();
        const refsRes = await fetch('/api/public/help-articles', { cache: 'no-store' });
        const refsJson = await refsRes.json().catch(() => ({}));
        if (!cancelled) {
          setArticle(j.article || null);
          setHelpRefs(Array.isArray(refsJson.articles) ? (refsJson.articles as HelpLinkRef[]) : []);
        }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const resolveHelpHref = useMemo(() => {
    const byId = new Map(helpRefs.map((item) => [item.id, item]));
    return (articleId: string) => {
      const hit = byId.get(articleId);
      if (!hit) return '/help';
      return `/help/article/${hit.slug}`;
    };
  }, [helpRefs]);

  const articleAnchors = useMemo(
    () => extractArticleAnchors(article?.content || ''),
    [article?.content],
  );

  const resolveMeta = useMemo(() => {
    const byId = new Map(helpRefs.map((item) => [item.id, item]));
    const anchorById = new Map(articleAnchors.map((anchor) => [anchor.id, anchor]));
    return (link: ParsedMarkdownLink): LinkResolvedMeta => {
      if (!link.target) {
        return { exists: false, title: link.label, subtitle: 'Invalid link format' };
      }
      if (link.target.type === 'external') {
        return {
          exists: true,
          title: link.label,
          subtitle: link.target.url,
        };
      }
      if (link.target.type === 'help') {
        const articleRef = byId.get(link.target.articleId);
        if (!articleRef) {
          return {
            exists: false,
            title: link.label,
            subtitle: 'Help article unavailable',
          };
        }
        return {
          exists: true,
          title: articleRef.title,
          subtitle: `/help/article/${articleRef.slug}`,
        };
      }
      if (link.target.type === 'help_anchor') {
        const anchor = anchorById.get(link.target.anchorId);
        if (!anchor) {
          return {
            exists: false,
            title: link.label,
            subtitle: `Section unavailable (#${link.target.anchorId})`,
          };
        }
        return {
          exists: true,
          title: anchor.title,
          subtitle: `Jump to #${anchor.id}`,
        };
      }
      return {
        exists: false,
        title: link.label,
        subtitle: 'Project-only reference not available in public help',
      };
    };
  }, [articleAnchors, helpRefs]);

  useEffect(() => {
    if (!article) return;
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (!hash) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [article?.id]);

  return (
    <div className="min-h-screen bg-slate-950/55 text-white backdrop-blur-[2px]">
      <header className="sticky top-0 z-20 min-h-28 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
        <div className="flex min-h-28 items-center px-4 [padding-left:7rem] sm:px-6 sm:[padding-left:8rem] lg:px-10 lg:[padding-left:8rem]">
          <a
            href="/help"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Help Center</span>
          </a>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <section className="glass-panel rounded-[1.5rem] p-6">
          {loading ? (
            <div className="text-sm text-slate-400">Loading article...</div>
          ) : missing || !article ? (
            <div className="text-sm text-slate-400">This article was not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Documentation</span>
              </div>
              <h1 className="text-2xl font-semibold text-white">{article.title}</h1>
              {article.summary && <p className="text-slate-300 text-sm">{article.summary}</p>}
              <div className="text-xs text-slate-500">
                Updated {new Date(article.updated_at).toLocaleString()}
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <LinkedContent
                  content={article.content || 'No content yet.'}
                  resolveMeta={resolveMeta}
                  resolveHelpHref={resolveHelpHref}
                  className="space-y-4 text-sm leading-6 text-slate-100 font-sans break-words [overflow-wrap:anywhere]"
                  onActivateHelpTeleport={(anchorId) => {
                    const target = document.getElementById(anchorId);
                    if (!target) return;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.history.replaceState(null, '', `#${anchorId}`);
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
