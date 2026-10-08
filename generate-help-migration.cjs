const fs = require('fs');
const directory = 'OlioWorkstation/UnofficialHelpArticles/';
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const articles = fs.readdirSync(directory).filter(name => name.endsWith('.md')).map(name => {
  const [, metadata, body] = fs.readFileSync(directory + name, 'utf8').replaceAll('\r\n', '\n').split('########');
  const field = key => metadata.match(new RegExp('^' + key + ': (.+)$', 'm'))[1].trim();
  return { slug: field('Slug'), title: field('Title'), summary: field('Summary'), order: Number(field('Sort Order')), content: body.trim() };
}).sort((a, b) => a.order - b.order);
const rows = articles.map(a => `(${[a.slug, a.title, a.summary, a.content].map(quote).join(',')},true,${a.order})`).join(',\n');
fs.writeFileSync('OlioWorkstation/supabase/migrations/20261006235000_audit_help_guides.sql', `-- Current maintained guides after the October 6, 2026 application audit.
-- Keep IDs and existing publication choices; do not change unrelated custom guides.
-- Content and metadata for the listed maintained slugs are intentionally refreshed.
BEGIN;

DELETE FROM public.help_articles WHERE slug = 'triggers-and-webhooks';

INSERT INTO public.help_articles (slug,title,summary,content,is_published,sort_order) VALUES
${rows}
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
`);
console.log(`Generated snapshot for ${articles.length} guides.`);
