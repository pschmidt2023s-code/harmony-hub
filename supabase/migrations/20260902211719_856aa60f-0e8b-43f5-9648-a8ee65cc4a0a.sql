ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumb_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_url text;

CREATE POLICY "Admins manage media objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read media objects"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'media');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'pschmidt2023s@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN lower(NEW.email) = 'pschmidt2023s@gmail.com' THEN 'admin'::app_role ELSE 'fan'::app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;