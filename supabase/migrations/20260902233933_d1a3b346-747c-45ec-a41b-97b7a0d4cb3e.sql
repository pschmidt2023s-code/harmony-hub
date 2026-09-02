ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS artist_name text NOT NULL DEFAULT 'TAYO',
  ADD COLUMN IF NOT EXISTS site_name text NOT NULL DEFAULT 'TAYO',
  ADD COLUMN IF NOT EXISTS site_title text NOT NULL DEFAULT 'TAYO — Offizielle Artist-Plattform',
  ADD COLUMN IF NOT EXISTS site_description text NOT NULL DEFAULT 'Musik, Releases, Videos, Tour und Merch von TAYO. R&B, Synthpop, Pop und Trap.',
  ADD COLUMN IF NOT EXISTS canonical_base_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_og_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS favicon_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT '#0a0a0a';

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;