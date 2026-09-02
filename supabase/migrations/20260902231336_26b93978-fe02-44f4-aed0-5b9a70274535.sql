CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Merch',
  status text NOT NULL DEFAULT 'Entwurf',
  image_url text,
  currency text NOT NULL DEFAULT 'EUR',
  base_price numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  stock integer,
  is_digital boolean NOT NULL DEFAULT false,
  digital_asset_url text,
  badge text,
  release_id text REFERENCES public.releases(id) ON DELETE SET NULL,
  song_id text REFERENCES public.songs(id) ON DELETE SET NULL,
  video_id text REFERENCES public.videos(id) ON DELETE SET NULL,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_slug_key ON public.products (slug);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_public ON public.products
  FOR SELECT TO anon, authenticated
  USING (status = 'Veröffentlicht' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY products_admin_write ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric,
  sale_price numeric,
  available boolean NOT NULL DEFAULT true,
  stock integer,
  image_url text,
  digital_asset_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_id_idx ON public.product_variants (product_id);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_variants_select_public ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'Veröffentlicht')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY product_variants_admin_write ON public.product_variants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'offen';

INSERT INTO public.products (id, name, slug, type, status, base_price, currency, stock, badge, sort_order, short_description)
VALUES
  ('p1','Midnight Gold Hoodie','midnight-gold-hoodie','Apparel','Veröffentlicht',89,'EUR',42,'Limited',1,''),
  ('p2','Afterglow Vinyl (Gold)','afterglow-vinyl-gold','Music','Veröffentlicht',34,'EUR',120,'Pre-Order',2,''),
  ('p3','TAYO Cap Embroidered','tayo-cap-embroidered','Accessoires','Veröffentlicht',39,'EUR',88,NULL,3,''),
  ('p4','Vinyl + Hoodie Bundle','vinyl-hoodie-bundle','Bundle','Veröffentlicht',109,'EUR',25,'Save 20%',4,'');

INSERT INTO public.product_variants (product_id, name, sort_order)
VALUES
  ('p1','S',1),('p1','M',2),('p1','L',3),('p1','XL',4),
  ('p2','180g',1),
  ('p3','One Size',1),
  ('p4','S',1),('p4','M',2),('p4','L',3),('p4','XL',4);