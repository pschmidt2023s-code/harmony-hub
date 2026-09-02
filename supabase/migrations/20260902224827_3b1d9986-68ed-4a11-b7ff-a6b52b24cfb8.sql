ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Entwurf',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_id text REFERENCES public.releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS song_id text REFERENCES public.songs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '';

UPDATE public.videos SET status = 'Veröffentlicht' WHERE status = 'Entwurf';

UPDATE public.videos v
SET slug = base.candidate
FROM (
  SELECT id,
         regexp_replace(
           regexp_replace(
             lower(translate(title, 'äöüßÄÖÜ', 'aous')),
             '[^a-z0-9]+', '-', 'g'),
           '^-|-$', '', 'g') || CASE WHEN rn = 1 THEN '' ELSE '-' || rn::text END AS candidate
  FROM (
    SELECT id, title,
           row_number() OVER (
             PARTITION BY regexp_replace(
               regexp_replace(lower(translate(title, 'äöüßÄÖÜ', 'aous')), '[^a-z0-9]+', '-', 'g'),
               '^-|-$', '', 'g')
             ORDER BY created_at, id) AS rn
    FROM public.videos
    WHERE slug IS NULL OR slug = ''
  ) t
) base
WHERE v.id = base.id AND (v.slug IS NULL OR v.slug = '');

UPDATE public.videos SET slug = 'video-' || id WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS videos_slug_key ON public.videos (slug);