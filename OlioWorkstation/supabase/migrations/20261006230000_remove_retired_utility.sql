-- Remove the retired utility and its saved configurations from existing installs.
BEGIN;

DROP TABLE IF EXISTS public.triggers;

DELETE FROM public.help_articles WHERE slug = 'triggers-and-webhooks';

-- Clean references in previously installed help content while preserving edits.
UPDATE public.help_articles
SET content = regexp_replace(
  replace(
    replace(content, 'links, projects, secrets, and triggers', 'links, projects, and secrets'),
    'secrets, short URLs, and triggers', 'secrets, and short URLs'
  ),
  E'^[^\n]*\\*\\*Triggers(/Webhooks)?\\*\\*[^\n]*(\n|$)', '', 'gn'
), updated_at = now()
WHERE content LIKE '%triggers%' OR content LIKE '%Triggers%';

COMMIT;
