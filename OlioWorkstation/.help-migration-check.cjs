const { PGlite } = require('./.org-sql-test.local/package/dist/index.cjs');
const { readFileSync } = require('fs');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE public.help_articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
    title text NOT NULL, summary text, content text NOT NULL,
    is_published boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  );`);
  const sql = readFileSync('supabase/migrations/20261006235000_audit_help_guides.sql', 'utf8');
  await db.exec(sql);
  let rows = (await db.query('SELECT * FROM public.help_articles')).rows;
  assert.equal(rows.length, 24);
  assert.ok(rows.every(row => row.is_published));
  const id = rows.find(row => row.slug === 'secret-sharing').id;
  await db.exec(`UPDATE public.help_articles SET is_published = false, content = 'outdated' WHERE slug = 'secret-sharing';
    INSERT INTO public.help_articles (slug,title,content,is_published) VALUES ('custom-team-guide','Custom guide','Keep custom content',false), ('triggers-and-webhooks','Retired','obsolete',true);`);
  await db.exec(sql);
  await db.exec(sql);
  rows = (await db.query('SELECT * FROM public.help_articles')).rows;
  assert.equal(rows.length, 25);
  const updated = rows.find(row => row.slug === 'secret-sharing');
  assert.equal(updated.id, id);
  assert.equal(updated.is_published, false);
  assert.match(updated.content, /Reveal secret/);
  assert.equal(rows.find(row => row.slug === 'custom-team-guide').content, 'Keep custom content');
  assert.equal(rows.find(row => row.slug === 'custom-team-guide').is_published, false);
  assert.ok(!rows.some(row => row.slug === 'triggers-and-webhooks'));
  await db.close();
  console.log('Migration verified: 24 new guides; stable IDs and draft visibility; custom guide retained; retired guide removed; safe reapplication.');
})().catch(error => { console.error(error); process.exitCode = 1; });
