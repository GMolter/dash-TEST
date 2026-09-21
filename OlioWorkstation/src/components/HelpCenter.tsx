import { ArrowUpRight, BookOpen, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import './helpCenter.css';

import { articleHref, type HelpSummary } from '../lib/helpCenter';

export function HelpShell({ children }: { children: ReactNode }) {
  return <div className="help-center">
    <a className="help-skip" href="#help-main">Skip to content</a>
    <header className="help-header"><a href="/help" className="help-brand"><span className="help-brand-icon"><BookOpen size={18} /></span><span>Olio <span className="help-brand-divider">/</span> Help Center</span></a><a href="/" className="help-back">Back to workspace <ArrowUpRight size={15} /></a></header>
    {children}
    <footer className="help-footer"><a href="/help">Olio Help Center</a><span>A little less scattered. A little more together.</span></footer>
  </div>;
}
export function ArticleRow({ article }: { article: HelpSummary }) {
  return <a className="help-article-row" href={articleHref(article.slug)}><span><strong>{article.title}</strong>{article.summary && <span>{article.summary}</span>}</span><ChevronRight size={18} aria-hidden="true" /></a>;
}
