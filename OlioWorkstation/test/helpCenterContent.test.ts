import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArticleDocument } from '../src/lib/helpArticleFormatting';
import { helpTopics } from '../src/lib/helpCenter';

const directory = resolve('UnofficialHelpArticles');
const articles = readdirSync(directory).filter(name => name.endsWith('.md')).map(name => {
  const [, metadata, content] = readFileSync(resolve(directory, name), 'utf8').replaceAll('\r\n', '\n').split('########');
  const field = (key: string) => metadata.match(new RegExp(`^${key}: (.+)$`, 'm'))![1].trim();
  return { name, slug: field('Slug'), title: field('Title'), summary: field('Summary'), order: Number(field('Sort Order')), content: content.trim() };
});

describe('Help Center content', () => {
  it('includes all maintained articles in the database migration', () => {
    const migration = readFileSync(resolve('supabase/migrations/20261006235000_audit_help_guides.sql'), 'utf8').replaceAll('\r\n', '\n');
    expect(articles).toHaveLength(24);
    expect(new Set(articles.map(article => article.slug)).size).toBe(articles.length);
    expect(new Set(articles.map(article => article.order)).size).toBe(articles.length);
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    for (const article of articles) {
      expect(migration).toContain(`(${[article.slug, article.title, article.summary, article.content].map(quote).join(',')},true,${article.order})`);
    }
    const conflictUpdate = migration.split('ON CONFLICT (slug) DO UPDATE SET')[1];
    expect(conflictUpdate).toBeTruthy();
    expect(conflictUpdate).not.toMatch(/\b(?:id|is_published)\s*=/);
    expect(migration).toContain("DELETE FROM public.help_articles WHERE slug = 'triggers-and-webhooks';");
  });
  it('places every maintained guide in exactly one topic and excludes the retired tool', () => {
    const categorized = helpTopics.flatMap(topic => topic.slugs);
    expect(categorized.slice().sort()).toEqual(articles.map(article => article.slug).sort());
    expect(new Set(categorized).size).toBe(categorized.length);
    for (const article of articles) {
      expect(article.content).not.toMatch(/triggers-and-webhooks|Utilities → Triggers/i);
      expect(parseArticleDocument(article.content).blocks.length, article.name).toBeGreaterThan(0);
    }
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
