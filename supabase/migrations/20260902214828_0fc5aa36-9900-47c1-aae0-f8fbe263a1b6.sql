CREATE TABLE public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  accent_mode text NOT NULL DEFAULT 'auto' CHECK (accent_mode IN ('auto','manual')),
  manual_accent text NOT NULL DEFAULT '#f59e0b',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_select_public" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site_settings_admin_insert" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;