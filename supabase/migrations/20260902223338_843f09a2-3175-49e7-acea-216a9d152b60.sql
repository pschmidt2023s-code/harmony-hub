ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS artist text NOT NULL DEFAULT 'TAYO',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Veröffentlicht',
  ADD COLUMN IF NOT EXISTS release_id text REFERENCES public.releases(id) ON DELETE SET NULL;

UPDATE public.songs
SET slug = regexp_replace(regexp_replace(lower(translate(title, 'äöüÄÖÜß', 'aouAOUs')), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') || '-' || left(md5(id), 4)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON public.songs (slug);

UPDATE public.songs s
SET release_id = r.id
FROM public.releases r
WHERE s.release_id IS NULL AND s.album = r.title;