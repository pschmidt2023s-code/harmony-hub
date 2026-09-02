ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS artist text NOT NULL DEFAULT 'TAYO',
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS explicit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '';

UPDATE public.releases
SET slug = regexp_replace(
      regexp_replace(
        lower(translate(title, 'äöüÄÖÜß', 'aouAOUs')),
        '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g')
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS releases_slug_key ON public.releases (slug);