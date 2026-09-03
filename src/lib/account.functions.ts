import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 21 — Fan Library (serverseitig).
 *
 * Alle Funktionen laufen über die bestehende Auth-Middleware. Es gibt keine
 * User-ID im Request-Body: die Identität kommt ausschließlich aus dem
 * validierten Token, damit niemand fremde Daten abfragen kann.
 */

export type OrderLine = { id: string; name?: string; variant?: string; qty?: number; total?: number };

/** Profil, Rollen und Kennzahlen des angemeldeten Fans. */
export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles, favorites, orders, wishlist, notifications, newsletter] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("display_name, avatar_url, notify_new_releases, notify_release_reminders, notify_account, locale")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("favorites").select("song_id", { count: "exact", head: true }),
      context.supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("wishlist_items").select("product_id"),
      context.supabase.from("release_notifications").select("release_id"),
      context.supabase
        .from("newsletter_subscribers")
        .select("status")
        .eq("email", (context.claims as { email?: string }).email ?? "")
        .maybeSingle(),
    ]);

    return {
      email: (context.claims as { email?: string }).email ?? "",
      profile: profile.data ?? null,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      favoriteCount: favorites.count ?? 0,
      orderCount: orders.count ?? 0,
      wishlist: (wishlist.data ?? []).map((w) => w.product_id),
      releaseNotifications: (notifications.data ?? []).map((n) => n.release_id),
      // Newsletter ist bewusst getrennt von den Release-Benachrichtigungen.
      newsletterStatus: newsletter.data?.status ?? null,
    };
  });

const profileInput = z.object({
  displayName: z.string().trim().max(80),
  locale: z.enum(["de", "en"]).optional(),
});

export const updateAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName || null, ...(data.locale ? { locale: data.locale } : {}) })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

const prefsInput = z.object({
  notify_new_releases: z.boolean().optional(),
  notify_release_reminders: z.boolean().optional(),
  notify_account: z.boolean().optional(),
});

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prefsInput.parse(data))
  .handler(async ({ data, context }) => {
    const patch: {
      notify_new_releases?: boolean;
      notify_release_reminders?: boolean;
      notify_account?: boolean;
    } = {};
    if (typeof data.notify_new_releases === "boolean") patch.notify_new_releases = data.notify_new_releases;
    if (typeof data.notify_release_reminders === "boolean") patch.notify_release_reminders = data.notify_release_reminders;
    if (typeof data.notify_account === "boolean") patch.notify_account = data.notify_account;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

const pageInput = z.object({ limit: z.number().int().min(1).max(50).default(10), offset: z.number().int().min(0).default(0) });

/**
 * Eigene Bestellungen (RLS: `auth.uid() = user_id`).
 * Gastbestellungen werden NICHT über die E-Mail zugeordnet.
 * Zahlungsdaten des Anbieters werden bewusst nicht ausgeliefert.
 */
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pageInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error, count } = await context.supabase
      .from("orders")
      .select("id, created_at, items, amount, currency, status, fulfillment_status", { count: "exact" })
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw error;

    return {
      total: count ?? 0,
      orders: (rows ?? []).map((o) => ({
        id: o.id,
        createdAt: o.created_at,
        amount: Number(o.amount),
        currency: o.currency,
        status: o.status,
        fulfillment: o.fulfillment_status,
        items: ((o.items ?? []) as OrderLine[]).map((i) => ({
          id: i.id,
          name: i.name ?? i.id,
          variant: i.variant ?? null,
          qty: i.qty ?? 1,
          total: i.total ?? null,
        })),
      })),
    };
  });

/** Produkt-IDs aus bezahlten Bestellungen des Fans. */
async function entitledProductIds(supabase: { from: (t: string) => any }, userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("items, status")
    .eq("user_id", userId)
    .in("status", ["paid", "bezahlt", "completed", "captured"]);
  if (error) throw error;
  const ids = new Set<string>();
  for (const order of (data ?? []) as { items: OrderLine[] }[]) {
    for (const line of order.items ?? []) if (line?.id) ids.add(line.id);
  }
  return ids;
}

/**
 * Digitale Downloads: nur Produkte, die der Fan wirklich gekauft hat und die
 * tatsächlich eine hinterlegte Datei besitzen. Die Datei-URL selbst wird hier
 * nicht ausgeliefert — nur ein Titel und eine Kennung.
 */
export const getMyDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ids = await entitledProductIds(context.supabase as never, context.userId);
    if (!ids.size) return [] as { key: string; productId: string; product: string; label: string; cover: string | null }[];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [products, variants] = await Promise.all([
      supabaseAdmin.from("products").select("id, name, image_url, digital_asset_url").in("id", [...ids]),
      supabaseAdmin.from("product_variants").select("id, product_id, name, image_url, digital_asset_url").in("product_id", [...ids]),
    ]);
    if (products.error) throw products.error;
    if (variants.error) throw variants.error;

    const out: { key: string; productId: string; product: string; label: string; cover: string | null }[] = [];
    for (const p of products.data ?? []) {
      if (p.digital_asset_url) out.push({ key: `product:${p.id}`, productId: p.id, product: p.name, label: p.name, cover: p.image_url });
    }
    for (const v of variants.data ?? []) {
      if (!v.digital_asset_url) continue;
      const product = (products.data ?? []).find((p) => p.id === v.product_id);
      out.push({
        key: `variant:${v.id}`,
        productId: v.product_id,
        product: product?.name ?? v.product_id,
        label: v.name,
        cover: v.image_url ?? product?.image_url ?? null,
      });
    }
    return out;
  });

/**
 * Erzeugt einen kurzlebigen, signierten Download-Link.
 * Die Berechtigung wird hier serverseitig erneut geprüft — der Client kann
 * keine fremde Kennung einsetzen. Öffentliche Storage-URLs entstehen nicht.
 */
export const createDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ key: z.string().min(3).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const [kind, id] = data.key.split(":");
    if ((kind !== "product" && kind !== "variant") || !id) throw new Error("Ungültiger Download.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let productId: string | null = null;
    let assetUrl: string | null = null;

    if (kind === "product") {
      const { data: row, error } = await supabaseAdmin
        .from("products")
        .select("id, digital_asset_url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      productId = row?.id ?? null;
      assetUrl = row?.digital_asset_url ?? null;
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("product_variants")
        .select("product_id, digital_asset_url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      productId = row?.product_id ?? null;
      assetUrl = row?.digital_asset_url ?? null;
    }

    if (!productId || !assetUrl) throw new Error("Download nicht verfügbar.");

    const ids = await entitledProductIds(context.supabase as never, context.userId);
    if (!ids.has(productId)) throw new Error("Keine Berechtigung für diesen Download.");

    // Dateien liegen im privaten Bucket "media"; signierte URL gilt 5 Minuten.
    const marker = "/api/public/media/";
    if (assetUrl.includes(marker)) {
      const path = decodeURIComponent(assetUrl.split(marker)[1] ?? "");
      const { data: signed, error } = await supabaseAdmin.storage.from("media").createSignedUrl(path, 300, {
        download: true,
      });
      if (error || !signed) throw error ?? new Error("Download nicht verfügbar.");
      return { url: signed.signedUrl };
    }
    return { url: assetUrl };
  });

/* ---------------------------------- Wunschliste --------------------------------- */

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ productId: z.string().min(1), on: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    if (data.on) {
      const { error } = await context.supabase
        .from("wishlist_items")
        .upsert({ user_id: context.userId, product_id: data.productId }, { onConflict: "user_id,product_id" });
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", context.userId)
        .eq("product_id", data.productId);
      if (error) throw error;
    }
    return { on: data.on };
  });

/* --------------------------- Release-Benachrichtigungen -------------------------- */

export const toggleReleaseNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ releaseId: z.string().min(1), on: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    if (data.on) {
      const { error } = await context.supabase
        .from("release_notifications")
        .upsert({ user_id: context.userId, release_id: data.releaseId }, { onConflict: "user_id,release_id" });
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("release_notifications")
        .delete()
        .eq("user_id", context.userId)
        .eq("release_id", data.releaseId);
      if (error) throw error;
    }
    return { on: data.on };
  });
