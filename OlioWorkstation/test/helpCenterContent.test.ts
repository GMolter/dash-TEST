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
    const migration = readFileSync(resolve('supabase/migrations/20260921120000_update_user_help_guides.sql'), 'utf8');
    expect(articles).toHaveLength(22);
    expect(new Set(articles.map(article => article.slug)).size).toBe(articles.length);
    const deletionUpdate = readFileSync(resolve('supabase/migrations/20260921130000_move_organization_deletion_help.sql'), 'utf8');
    for (const article of articles) {
      const source = ['organizations', 'organization-management', 'profile-and-settings'].includes(article.slug) ? deletionUpdate : migration;
      expect(source).toContain(article.content.replaceAll("'", "''"));
    }
    expect(articles.some(article => article.slug === 'triggers-and-webhooks')).toBe(false);
    expect(migration).toContain("WHERE slug='triggers-and-webhooks'");
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
