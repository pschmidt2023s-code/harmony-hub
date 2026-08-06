CREATE TABLE public.songs (
  id text PRIMARY KEY,
  title text NOT NULL,
  album text NOT NULL,
  type text NOT NULL,
  cover_key text NOT NULL,
  duration integer NOT NULL,
  genre text NOT NULL,
  bpm integer NOT NULL,
  song_key text NOT NULL,
  mood text NOT NULL,
  songwriter text NOT NULL,
  producer text NOT NULL,
  isrc text NOT NULL,
  explicit boolean NOT NULL DEFAULT false,
  links jsonb NOT NULL DEFAULT '{}'::jsonb,
  lyrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.songs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY songs_select_public ON public.songs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY songs_admin_write ON public.songs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.releases (
  id text PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL,
  cover_key text NOT NULL,
  release_date date NOT NULL,
  status text NOT NULL,
  description text NOT NULL DEFAULT '',
  tracks integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.releases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY releases_select_public ON public.releases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY releases_admin_write ON public.releases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.videos (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  thumb_key text NOT NULL,
  video_date date NOT NULL,
  views text NOT NULL DEFAULT '0',
  song text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY videos_select_public ON public.videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY videos_admin_write ON public.videos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.songs (id, title, album, type, cover_key, duration, genre, bpm, song_key, mood, songwriter, producer, isrc, explicit, links, lyrics, sort_order) VALUES
('midnight-gold','Midnight Gold','MIDNIGHT GOLD','Single','midnight',212,'R&B / Synthpop',92,'F# Minor','Warm · Nocturnal','TAYO, L. Marek','NOVUM','DEA621900101',false,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Neon auf der Haut, die Stadt hält den Atem an"},{"time":12,"line":"Wir fahren durch den Regen, keiner sagt ein Wort"},{"time":26,"line":"Midnight gold, alles glänzt wenn du gehst"},{"time":40,"line":"Midnight gold, und ich bleib'' wo du warst"}]',1),
('neon-heart','Neon Heart','AFTERGLOW EP','EP','neon',187,'Synthpop',108,'A Minor','Euphorisch','TAYO','TAYO, KIRO','DEA621900102',false,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Ein Puls aus Licht, ein Herz aus Neon"},{"time":14,"line":"Du tanzt im Spiegel, ich verlier'' die Zeit"}]',2),
('smoke-signals','Smoke Signals','AFTERGLOW EP','EP','smoke',234,'Trap / R&B',74,'C Minor','Dunkel · Hypnotisch','TAYO, N. Adisa','NOVUM','DEA621900103',true,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Rauchzeichen über der Skyline"},{"time":18,"line":"Ich schick'' dir Feuer, du schickst Stille"}]',3),
('afterglow','Afterglow','AFTERGLOW EP','EP','neon',199,'Pop / R&B',96,'D Major','Sehnsüchtig','TAYO','KIRO','DEA621900104',false,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Nach dem Licht bleibt immer noch ein Schimmer"}]',4),
('velvet-static','Velvet Static','MIDNIGHT GOLD','Single','midnight',221,'R&B',84,'G Minor','Samtig','TAYO, L. Marek','NOVUM','DEA621900105',false,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Samt und Rauschen, dazwischen deine Stimme"}]',5),
('black-satin','Black Satin','SINGLES','Single','smoke',176,'Trap',140,'E Minor','Kalt · Elegant','TAYO','TAYO','DEA621900106',true,'{"spotify":"https://open.spotify.com","apple":"https://music.apple.com","youtube":"https://youtube.com","amazon":"https://music.amazon.com","deezer":"https://deezer.com"}','[{"time":0,"line":"Schwarzer Satin, keine Spuren im Schnee"}]',6);

INSERT INTO public.releases (id, title, type, cover_key, release_date, status, description, tracks) VALUES
('midnight-gold','MIDNIGHT GOLD','Single','midnight','2026-07-24','Veröffentlicht','Die neue Single — warmer R&B über kalten Synths.',2),
('afterglow-ep','AFTERGLOW EP','EP','neon','2026-09-12','Vorbestellung','Fünf Tracks zwischen Euphorie und Abschied.',5),
('black-satin','BLACK SATIN','Single','smoke','2026-10-31','Mastering','Trap-Cut mit orchestralem Unterbau.',1),
('nocturne-album','NOCTURNE','Album','midnight','2027-02-14','In Produktion','Das Debütalbum. 14 Tracks.',14);

INSERT INTO public.videos (id, title, category, thumb_key, video_date, views, song, sort_order) VALUES
('v1','Midnight Gold — Official Video','Musikvideo','midnight','2026-07-24','1.2M','Midnight Gold',1),
('v2','Neon Heart — Visualizer','Visualizer','neon','2026-08-02','410K','Neon Heart',2),
('v3','Smoke Signals — Lyric Video','Lyric Video','smoke','2026-08-16','289K','Smoke Signals',3),
('v4','Live at Kesselhaus','Live','midnight','2026-06-09','755K','Velvet Static',4),
('v5','Studio Diaries — Afterglow','Behind the Scenes','neon','2026-08-29','132K','Afterglow',5),
('v6','Black Satin — Teaser','Short','smoke','2026-09-30','98K','Black Satin',6);