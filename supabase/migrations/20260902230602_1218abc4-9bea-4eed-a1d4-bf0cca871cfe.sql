ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'subscribed',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.newsletter_subscribers SET consent_at = created_at WHERE consent_at IS NULL;

ALTER TABLE public.newsletter_subscribers
  ALTER COLUMN consent_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT UPDATE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

DROP POLICY IF EXISTS newsletter_update_admin ON public.newsletter_subscribers;
CREATE POLICY newsletter_update_admin ON public.newsletter_subscribers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_list_fans(
  _search text DEFAULT '',
  _filter text DEFAULT 'all',
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  email text,
  registered_at timestamptz,
  last_sign_in_at timestamptz,
  order_count bigint,
  order_total numeric,
  last_order_at timestamptz,
  favorites_count bigint,
  newsletter_status text,
  newsletter_consent_at timestamptz,
  newsletter_source text,
  is_admin boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      u.id,
      p.display_name,
      p.avatar_url,
      u.email::text AS email,
      u.created_at AS registered_at,
      u.last_sign_in_at,
      COALESCE(o.cnt, 0)::bigint AS order_count,
      COALESCE(o.total, 0)::numeric AS order_total,
      o.last_at AS last_order_at,
      COALESCE(f.cnt, 0)::bigint AS favorites_count,
      n.status AS newsletter_status,
      n.consent_at AS newsletter_consent_at,
      n.source AS newsletter_source,
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'::app_role) AS is_admin
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN LATERAL (
      SELECT count(*) AS cnt, sum(amount) AS total, max(created_at) AS last_at
      FROM public.orders ord
      WHERE ord.user_id = u.id OR lower(ord.email) = lower(u.email)
    ) o ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS cnt FROM public.favorites fav WHERE fav.user_id = u.id
    ) f ON true
    LEFT JOIN public.newsletter_subscribers n ON lower(n.email) = lower(u.email)
    WHERE u.deleted_at IS NULL
      AND (
        _search IS NULL OR _search = ''
        OR u.email ILIKE '%' || _search || '%'
        OR COALESCE(p.display_name, '') ILIKE '%' || _search || '%'
      )
  ), filtered AS (
    SELECT * FROM base b
    WHERE CASE _filter
      WHEN 'newsletter' THEN b.newsletter_status = 'subscribed'
      WHEN 'no_newsletter' THEN b.newsletter_status IS DISTINCT FROM 'subscribed'
      WHEN 'customers' THEN b.order_count > 0
      WHEN 'non_customers' THEN b.order_count = 0
      ELSE true
    END
  )
  SELECT f.*, (SELECT count(*) FROM filtered)::bigint AS total_count
  FROM filtered f
  ORDER BY f.registered_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_fans(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_fans(text, text, int, int) TO authenticated;