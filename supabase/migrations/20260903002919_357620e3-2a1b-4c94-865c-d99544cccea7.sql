ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_access_level_check;
ALTER TABLE public.songs
  ADD CONSTRAINT songs_access_level_check CHECK (access_level IN ('PUBLIC', 'EXCLUSIVE'));

CREATE TABLE IF NOT EXISTS public.play_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS play_history_user_played_idx ON public.play_history (user_id, played_at DESC);

GRANT SELECT, INSERT, DELETE ON public.play_history TO authenticated;
GRANT ALL ON public.play_history TO service_role;
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "play_history_select_own" ON public.play_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "play_history_insert_own" ON public.play_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "play_history_delete_own" ON public.play_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.playback_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id text NOT NULL,
  position_seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, song_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playback_positions TO authenticated;
GRANT ALL ON public.playback_positions TO service_role;
ALTER TABLE public.playback_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playback_positions_manage_own" ON public.playback_positions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_playback_positions_updated_at
  BEFORE UPDATE ON public.playback_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();