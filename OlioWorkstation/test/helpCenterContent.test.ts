import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArticleDocument } from '../src/lib/helpArticleFormatting';

const directory = resolve('UnofficialHelpArticles');
const articles = readdirSync(directory).filter(name => name.endsWith('.md')).map(name => {
  const [, metadata, content] = readFileSync(resolve(directory, name), 'utf8').split('########');
  return { name, slug: metadata.match(/Slug: (.+)/)![1].trim(), content: content.trim() };
});

describe('Help Center content', () => {
  it('includes all maintained articles in the database migration', () => {
    const migration = readFileSync(resolve('supabase/migrations/20260909120000_refresh_help_center.sql'), 'utf8');
    expect(articles).toHaveLength(21);
    for (const article of articles) expect(migration).toContain(article.content.replaceAll("'", "''"));
  });
  it('uses valid article links and section anchors in the site renderer', () => {
    const slugs = new Set(articles.map(article => article.slug));
    for (const article of articles) {
      const document = parseArticleDocument(article.content);
      const anchors = new Set(document.blocks.flatMap(block => block.kind === 'heading' ? [block.anchorId] : []));
      for (const match of article.content.matchAll(/olio:\/\/help-anchor\/([^\s)]+)/g)) expect(anchors.has(match[1]), `${article.name}: ${match[1]}`).toBe(true);
      for (const match of article.content.matchAll(/olio:\/\/help\/([^\s)]+)/g)) expect(slugs.has(match[1]), `${article.name}: ${match[1]}`).toBe(true);
    }
  });
});
