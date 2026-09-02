import { queryOptions } from "@tanstack/react-query";
import merchHoodie from "@/assets/merch-hoodie.jpg";
import merchVinyl from "@/assets/merch-vinyl.jpg";
import merchCap from "@/assets/merch-cap.jpg";
import { getShopCatalog } from "./shop.functions";
import { normalizeSettings, type PublicSiteSettings } from "./seo";

/** Fallback-Artwork für die bestehenden Bestandsprodukte ohne Mediathek-Bild. */
const LEGACY_IMAGES: Record<string, string> = {
  p1: merchHoodie,
  p2: merchVinyl,
  p3: merchCap,
  p4: merchHoodie,
};

export const productImage = (id: string, url: string | null | undefined) =>
  url || LEGACY_IMAGES[id] || merchHoodie;

export type ShopVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  available: boolean;
  stock: number | null;
  image: string | null;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  type: string;
  image: string;
  currency: string;
  price: number;
  basePrice: number;
  salePrice: number | null;
  badge: string | null;
  stock: number | null;
  isDigital: boolean;
  releaseId: string | null;
  songId: string | null;
  videoId: string | null;
  seoTitle: string;
  seoDescription: string;
  variants: ShopVariant[];
};

/** Effektiver Preis: Aktionspreis schlägt Grundpreis (bestehende Preisarchitektur). */
export function effectivePrice(base: number | null, sale: number | null | undefined) {
  const b = Number(base ?? 0);
  const s = sale == null ? null : Number(sale);
  return s != null && s > 0 && s < b ? s : b;
}

export function money(value: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(value);
}

/**
 * Ein Katalog-Query für alles: Produkte und die öffentlichen SEO-Standardwerte
 * kommen aus derselben Serverantwort. `shopQueryOptions` ist nur eine Sicht darauf,
 * damit bestehende Aufrufe unverändert weiterarbeiten.
 */
export const shopCatalogQueryOptions = queryOptions({
  queryKey: ["shop-catalog"],
  staleTime: 60_000,
  queryFn: async (): Promise<{ products: ShopProduct[]; settings: PublicSiteSettings }> => {
    const data = await getShopCatalog();
    const products = data.products.map((p) => {
      const variants = data.variants
        .filter((v) => v.product_id === p.id)
        .map<ShopVariant>((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price:
            v.price == null
              ? effectivePrice(Number(p.base_price), p.sale_price)
              : effectivePrice(Number(v.price), v.sale_price),
          available: v.available,
          stock: v.stock,
          image: v.image_url,
        }));
      return {
        id: p.id,
        slug: p.slug || p.id,
        name: p.name,
        description: p.description ?? "",
        shortDescription: p.short_description ?? "",
        type: p.type,
        image: productImage(p.id, p.image_url),
        currency: p.currency || "EUR",
        price: effectivePrice(Number(p.base_price), p.sale_price),
        basePrice: Number(p.base_price),
        salePrice: p.sale_price == null ? null : Number(p.sale_price),
        badge: p.badge,
        stock: p.stock,
        isDigital: p.is_digital,
        releaseId: p.release_id,
        songId: p.song_id,
        videoId: p.video_id,
        seoTitle: p.seo_title ?? "",
        seoDescription: p.seo_description ?? "",
        variants,
      } satisfies ShopProduct;
    });
    return { products, settings: normalizeSettings(data.settings) };
  },
});

export const shopQueryOptions = {
  ...shopCatalogQueryOptions,
  select: (d: { products: ShopProduct[]; settings: PublicSiteSettings }) => d.products,
};

/** Preis einer Zeile im Warenkorb: Variantenpreis, sonst Produktpreis. */
export function linePrice(product: ShopProduct | undefined, variantName: string) {
  if (!product) return 0;
  const variant = product.variants.find((v) => v.name === variantName);
  return variant?.price ?? product.price;
}
