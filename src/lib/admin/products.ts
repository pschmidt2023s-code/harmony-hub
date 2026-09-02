import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { slugifyTitle } from "./releases";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];

/** Sicherer Lebenszyklus — es gibt bewusst kein permanentes Löschen im Produkt-CMS. */
export const PRODUCT_STATUSES = ["Entwurf", "Veröffentlicht", "Offline", "Archiviert"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Bestehende Produkttypen des Katalogs — digital-first, keine erfundenen Kategorien. */
export const PRODUCT_TYPES = [
  "Digital Album",
  "Digital Single",
  "Bundle",
  "Music",
  "Apparel",
  "Accessoires",
] as const;

export const PAGE_SIZE = 12;

export const adminProductsQueryOptions = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as ProductRow[];
  },
});

export const adminVariantsQueryOptions = queryOptions({
  queryKey: ["admin", "product-variants"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as VariantRow[];
  },
});

export function adminProductQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["admin", "product", id],
    queryFn: async () => {
      const [product, variants] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).maybeSingle(),
        supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
      ]);
      if (product.error) throw product.error;
      if (variants.error) throw variants.error;
      return {
        product: (product.data ?? null) as ProductRow | null,
        variants: (variants.data ?? []) as VariantRow[],
      };
    },
  });
}

export const newProductId = () => `prod_${crypto.randomUUID().slice(0, 8)}`;

export async function uniqueProductSlug(base: string, ignoreId?: string) {
  const root = slugifyTitle(base) || "produkt";
  const { data, error } = await supabase.from("products").select("id, slug");
  if (error) throw error;
  const taken = new Set((data ?? []).filter((p) => p.id !== ignoreId).map((p) => p.slug));
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

export async function saveProduct(values: ProductInsert, mode: "insert" | "update") {
  const q =
    mode === "insert"
      ? supabase.from("products").insert(values)
      : supabase.from("products").update(values).eq("id", values.id!);
  const { error } = await q;
  if (error) throw error;
}

/** Nur der Status wird geändert — Preise, Medien und Zuordnungen bleiben unangetastet. */
export async function setProductStatus(id: string, status: ProductStatus) {
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) throw error;
}

export type VariantDraft = {
  id?: string;
  name: string;
  sku: string | null;
  price: number | null;
  sale_price: number | null;
  available: boolean;
  stock: number | null;
  image_url: string | null;
  digital_asset_url: string | null;
};

/** Varianten werden differenziell gespeichert; entfernte Zeilen werden gelöscht. */
export async function saveVariants(productId: string, drafts: VariantDraft[], existing: VariantRow[]) {
  const keep = new Set(drafts.map((d) => d.id).filter(Boolean) as string[]);
  const removed = existing.filter((v) => !keep.has(v.id)).map((v) => v.id);
  if (removed.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", removed);
    if (error) throw error;
  }
  for (const [index, d] of drafts.entries()) {
    const payload: VariantInsert = {
      product_id: productId,
      name: d.name.trim(),
      sku: d.sku?.trim() || null,
      price: d.price,
      sale_price: d.sale_price,
      available: d.available,
      stock: d.stock,
      image_url: d.image_url,
      digital_asset_url: d.digital_asset_url,
      sort_order: index + 1,
    };
    const { error } = d.id
      ? await supabase.from("product_variants").update(payload).eq("id", d.id)
      : await supabase.from("product_variants").insert(payload);
    if (error) throw error;
  }
}

/**
 * Sichere Duplizierung: neuer Datensatz als Entwurf mit eigenem Slug.
 * Mediendateien werden NICHT kopiert (nur dieselbe Referenz), Bestellbezüge nie.
 */
export async function duplicateProduct(product: ProductRow, variants: VariantRow[]) {
  const id = newProductId();
  const slug = await uniqueProductSlug(`${product.name} kopie`);
  const { created_at: _c, updated_at: _u, ...rest } = product;
  const { error } = await supabase.from("products").insert({
    ...rest,
    id,
    slug,
    name: `${product.name} (Kopie)`,
    status: "Entwurf",
  });
  if (error) throw error;
  if (variants.length) {
    const { error: vErr } = await supabase.from("product_variants").insert(
      variants.map((v) => ({
        product_id: id,
        name: v.name,
        sku: null,
        price: v.price,
        sale_price: v.sale_price,
        available: v.available,
        stock: v.stock,
        image_url: v.image_url,
        digital_asset_url: v.digital_asset_url,
        sort_order: v.sort_order,
      })),
    );
    if (vErr) throw vErr;
  }
  return id;
}

export function productAvailability(p: Pick<ProductRow, "status">) {
  return p.status === "Veröffentlicht" ? "Öffentlich" : p.status;
}

export const isProductPublic = (p: Pick<ProductRow, "status">) => p.status === "Veröffentlicht";
