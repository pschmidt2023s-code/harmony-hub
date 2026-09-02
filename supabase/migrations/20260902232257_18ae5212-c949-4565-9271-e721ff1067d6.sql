DROP POLICY IF EXISTS products_select_public ON public.products;
CREATE POLICY products_select_public ON public.products
  FOR SELECT TO anon
  USING (status = 'Veröffentlicht'::text);
CREATE POLICY products_select_auth ON public.products
  FOR SELECT TO authenticated
  USING (status = 'Veröffentlicht'::text OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS product_variants_select_public ON public.product_variants;
CREATE POLICY product_variants_select_public ON public.product_variants
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'Veröffentlicht'::text));
CREATE POLICY product_variants_select_auth ON public.product_variants
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'Veröffentlicht'::text)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );