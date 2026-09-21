import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { HelpShell, ArticleRow } from '../components/HelpCenter';
import { topicFor } from '../lib/helpCenter';
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
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    setLoading(true);
    setError(false);
    setArticle(null);

    async function load() {
      try {
        const r = await fetch(`/api/public/help-article?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (r.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }
        if (!r.ok) throw new Error('Unable to load article');
        const j = await r.json();
        const refsJson = await fetch('/api/public/help-articles', { cache: 'no-store' }).then(response => response.ok ? response.json() : {}).catch(() => ({}));
        if (!cancelled) {
          setArticle(j.article || null);
          setHelpRefs(Array.isArray(refsJson.articles) ? (refsJson.articles as HelpLinkRef[]) : []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  const resolveHelpHref = useMemo(() => {
    const byId = new Map(helpRefs.flatMap((item) => [[item.id, item], [item.slug, item]]));
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
    const byId = new Map(helpRefs.flatMap((item) => [[item.id, item], [item.slug, item]]));
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
  }, [article]);

  const topic = topicFor(slug);
  const sections = articleAnchors.filter(anchor => anchor.level === 2);
  const related = helpRefs.filter(ref => ref.slug !== slug && topicFor(ref.slug)?.id === topic?.id).slice(0, 4);
  const sectionLinks = <nav className="help-toc" aria-label="Article sections">{sections.map(anchor => <a key={anchor.id} href={'#' + anchor.id}>{anchor.title}</a>)}</nav>;
  const date = article?.updated_at ? new Date(article.updated_at) : null;
  return <HelpShell><main id="help-main" className="help-reader">
    <nav className="help-breadcrumb" aria-label="Breadcrumb"><a href="/help">Help Center</a><ChevronRight size={13} /><span>{topic?.name || 'Guides'}</span></nav>
    {loading ? <div className="help-state" role="status">Opening your guide…</div> : error ? <div className="help-state" role="alert"><h1>We couldn’t open this guide.</h1><p>Check your connection and try again.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : missing || !article ? <div className="help-state"><h1>This guide isn’t available.</h1><p>Browse the library to find another guide.</p><a href="/help">Explore all guides</a></div> : <>
      <div className="help-reading-grid"><article>
        <header className="help-article-header"><div className="help-eyebrow">{topic?.name.toUpperCase() || 'OLIO GUIDE'}</div><h1>{article.title}</h1>{article.summary && <p>{article.summary}</p>}<div className="help-article-meta"><span>{Math.max(1, Math.ceil(article.content.split(/\s+/).length / 200))} min read</span>{date && !Number.isNaN(date.getTime()) && <span>Updated {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}</div></header>
        {sections.length > 0 && <details className="help-mobile-toc"><summary>In this guide</summary>{sectionLinks}</details>}
        <LinkedContent content={article.content || 'This guide is being prepared.'} resolveMeta={resolveMeta} resolveHelpHref={resolveHelpHref} className="help-prose" onActivateHelpTeleport={(anchorId) => { const target = document.getElementById(anchorId); if (target) { target.scrollIntoView({ block: 'start' }); window.history.replaceState(null, '', '#' + anchorId); } }} />
      </article><aside className="help-reading-aside">{sections.length > 0 && <><div className="help-eyebrow">IN THIS GUIDE</div>{sectionLinks}</>}<a className="help-article-row" style={{ marginTop: 28 }} href="/help"><span>Browse all guides</span><ChevronRight size={16} /></a></aside></div>
      {related.length > 0 && <section className="help-related"><h2>Keep exploring</h2><div className="help-related-grid">{related.map(ref => <ArticleRow key={ref.id} article={ref} />)}</div></section>}
    </>}
  </main></HelpShell>;
}
