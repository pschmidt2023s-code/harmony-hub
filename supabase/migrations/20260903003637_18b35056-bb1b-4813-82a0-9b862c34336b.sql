-- Phase 21: persönliche Fan-Listen (Wunschliste, Release-Benachrichtigungen) + Präferenzen im Profil

CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_manage_own" ON public.wishlist_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX wishlist_items_user_idx ON public.wishlist_items (user_id);

CREATE TABLE public.release_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id text NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, release_id)
);

GRANT SELECT, INSERT, DELETE ON public.release_notifications TO authenticated;
GRANT ALL ON public.release_notifications TO service_role;

ALTER TABLE public.release_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "release_notifications_manage_own" ON public.release_notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX release_notifications_user_idx ON public.release_notifications (user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_new_releases boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_release_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_account boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'de';