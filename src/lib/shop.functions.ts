import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Öffentlicher Produktkatalog.
 * Die Sichtbarkeit entscheidet IMMER der Server bzw. die RLS-Policy:
 * ausgeliefert werden ausschließlich Produkte mit Status "Veröffentlicht".
 * Geschützte Downloaddateien (digital_asset_url) werden hier NIE mitgeliefert.
 */
export const getShopCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const [products, variants, settings] = await Promise.all([
    supabasePublic
      .from("products")
      .select(
        "id, name, slug, description, short_description, type, status, image_url, currency, base_price, sale_price, stock, is_digital, badge, release_id, song_id, video_id, seo_title, seo_description, sort_order, updated_at",
      )
      .eq("status", "Veröffentlicht")
      .order("sort_order", { ascending: true }),
    supabasePublic
      .from("product_variants")
      .select("id, product_id, name, sku, price, sale_price, available, stock, image_url, sort_order")
      .order("sort_order", { ascending: true }),
    supabasePublic
      .from("site_settings")
      .select(
        "artist_name, site_name, site_title, site_description, canonical_base_url, default_og_image, logo_url, favicon_url, default_locale, theme_color",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (products.error) throw products.error;
  if (variants.error) throw variants.error;

  const ids = new Set((products.data ?? []).map((p) => p.id));
  return {
    products: products.data ?? [],
    variants: (variants.data ?? []).filter((v) => ids.has(v.product_id)),
    settings: settings.data ?? null,
  };
});
