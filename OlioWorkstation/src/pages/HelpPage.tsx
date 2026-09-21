import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, X, Compass, LayoutGrid, FolderOpen, Link2, SlidersHorizontal } from 'lucide-react';
import { ArticleRow, HelpShell } from '../components/HelpCenter';
import { helpTopics, topicFor, articleHref, type HelpSummary } from '../lib/helpCenter';

const icons = [Compass, LayoutGrid, FolderOpen, Link2, SlidersHorizontal];
export function HelpPage() {
  const [articles, setArticles] = useState<HelpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [topic, setTopic] = useState('all');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    fetch('/api/public/help-articles', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Unable to load guides');
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error('Unable to load guides');
      if (!cancelled) setArticles(data.articles);
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);
  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => articles.filter(article => {
    const category = topicFor(article.slug);
    const text = `${article.title} ${article.summary || ''} ${category?.name || ''}`.toLowerCase();
    return (topic === 'all' || category?.id === topic) && query.split(/\s+/).every(word => text.includes(word));
  }), [articles, query, topic]);
  const featured = ['getting-started', 'home-dashboard', 'plugins-and-classdash'].map(slug => articles.find(article => article.slug === slug)).filter((article): article is HelpSummary => !!article);
  return <HelpShell><main id="help-main" className="help-home">
    <section className="help-hero">
      <div className="help-eyebrow"><span /> A GUIDE TO YOUR WORKSPACE</div>
      <h1>Find your way.<br /><span>Make it yours.</span></h1>
      <p>Practical answers for whatever you’re working on.</p>
      <div className="help-search"><Search size={21} aria-hidden="true" /><input aria-label="Search help articles" placeholder="Try “quick links” or “join a team”" value={search} onChange={event => { setSearch(event.target.value); setTopic('all'); }} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={18} /></button>}</div>
      <div className="help-search-hint">Explore the guides below, or search by tool or task.</div>
      <div className="help-orbit" aria-hidden="true"><div /><div /><div /><BookMark /></div>
    </section>
    {!query && topic === 'all' && !loading && !error && featured.length > 0 && <section className="help-featured" aria-label="Start here">{featured.map((article) => <a key={article.id} href={articleHref(article.slug)}><span className="help-eyebrow">{article.slug === 'getting-started' ? 'NEW TO OLIO' : article.slug === 'home-dashboard' ? 'MAKE IT YOURS' : 'PLAN YOUR DAY'}</span><strong>{article.title}</strong><span>{article.summary}</span><ArrowRight size={20} aria-hidden="true" /></a>)}</section>}
    <section className="help-library" aria-labelledby="guide-heading">
      <div className="help-section-heading"><div><div className="help-eyebrow">THE GUIDE LIBRARY</div><h2 id="guide-heading">{query ? 'Search results' : 'What would you like to do?'}</h2></div><span aria-live="polite">{!loading && !error && `${filtered.length} ${filtered.length === 1 ? 'guide' : 'guides'}`}</span></div>
      <div className="help-filters" aria-label="Filter by topic"><button aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All guides</button>{helpTopics.map(item => <button key={item.id} aria-pressed={topic === item.id} onClick={() => setTopic(item.id)}>{item.name}</button>)}</div>
      {loading ? <div className="help-state" role="status">Loading your guides…</div> : error ? <div className="help-state" role="alert"><h3>We couldn’t load the guides.</h3><p>Check your connection and try again.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : filtered.length === 0 ? <div className="help-state"><Search size={28} /><h3>{query ? 'No matching guides yet.' : 'No guides in this view.'}</h3><p>{query ? 'Try a tool name or a shorter search.' : 'Choose another topic to keep exploring.'}</p>{(query || topic !== 'all') && <button onClick={() => { setSearch(''); setTopic('all'); }}>Show all guides</button>}</div> : query ? <div className="help-results">{filtered.map(article => <ArticleRow key={article.id} article={article} />)}</div> : <div className="help-topic-grid">{[...helpTopics, { id: 'more', name: 'More guides', description: 'More ways to get the most out of Olio.', slugs: [] }].map((category, index) => {
        const matches = filtered.filter(article => (topicFor(article.slug)?.id || 'more') === category.id);
        const Icon = icons[index] || Compass;
        return matches.length > 0 && <section key={category.id} className="help-topic-card"><div className="help-topic-heading"><span className="help-topic-icon"><Icon size={21} /></span><span><h3>{category.name}</h3><p>{category.description}</p></span></div>{matches.map(article => <ArticleRow key={article.id} article={article} />)}</section>;
      })}</div>}
    </section>
    <section className="help-bottom-note"><Compass size={25} /><div><h2>A good place to start</h2><p>Pick a tool in your workspace, then use these guides to make it work for you.</p></div><a href="/">Open Olio <ArrowRight size={16} /></a></section>
  </main></HelpShell>;
}
function BookMark() { return <span className="help-orbit-center"><Compass size={48} strokeWidth={1} /></span>; }
