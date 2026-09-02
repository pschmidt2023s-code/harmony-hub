import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { orderItems, itemQty, itemTotal, itemUnitPrice } from "./orders";

/**
 * Artist Intelligence (Phase 13).
 *
 * Grundsatz: es werden ausschließlich vorhandene Datenquellen ausgewertet.
 *  - public.releases / songs / videos / products  -> Katalogkennzahlen (Lifetime)
 *  - public.orders                                -> Commerce (echte Bestelldaten)
 *  - public.newsletter_subscribers                -> Newsletter (echte Einwilligungen)
 *  - admin_list_fans (SECURITY DEFINER, Adminprüfung intern) -> Fans / Kunden
 *
 * Nicht vorhanden und daher bewusst NICHT dargestellt:
 *  - Plays, Views, Downloads, Streams externer Plattformen (kein Tracking, keine API)
 *  - Favoriten-Aggregate (RLS: Favoriten sind ausschließlich nutzereigen lesbar)
 * Für diese Kennzahlen wird ein ehrlicher „Nicht verfügbar“-Zustand gerendert.
 */

export const RANGES = [
  { value: "7d", label: "7 Tage", days: 7 },
  { value: "30d", label: "30 Tage", days: 30 },
  { value: "90d", label: "90 Tage", days: 90 },
  { value: "12m", label: "12 Monate", days: 365 },
  { value: "all", label: "Gesamt", days: null },
] as const;

export type RangeValue = (typeof RANGES)[number]["value"];

export const rangeLabel = (r: RangeValue) => RANGES.find((x) => x.value === r)?.label ?? r;

/** Startzeitpunkt des Zeitraums als ISO-String (UTC, wie alle Zeitstempel der Datenbank). */
export function rangeStart(range: RangeValue): string | null {
  const def = RANGES.find((r) => r.value === range);
  if (!def || def.days === null) return null;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (def.days - 1));
  return d.toISOString();
}

/** Monatsraster bei langen Zeiträumen, sonst Tagesraster. */
export const rangeBucket = (range: RangeValue): "day" | "month" => (range === "12m" || range === "all" ? "month" : "day");

const MAX_ROWS = 2000;

/* --------------------------------- Katalog -------------------------------- */

async function countRows(table: "releases" | "songs" | "videos" | "products", column: string, value: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

async function countAll(table: "releases" | "songs" | "videos" | "products") {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export type CatalogStats = {
  releases: { total: number; published: number };
  songs: { total: number; published: number };
  videos: { total: number; published: number };
  products: { total: number; published: number };
};

export const catalogStatsQueryOptions = queryOptions({
  queryKey: ["admin", "analytics", "catalog"],
  queryFn: async (): Promise<CatalogStats> => {
    const [rt, rp, st, sp, vt, vp, pt, pp] = await Promise.all([
      countAll("releases"),
      countRows("releases", "status", "Veröffentlicht"),
      countAll("songs"),
      countRows("songs", "status", "Veröffentlicht"),
      countAll("videos"),
      countRows("videos", "status", "Veröffentlicht"),
      countAll("products"),
      countRows("products", "status", "Veröffentlicht"),
    ]);
    return {
      releases: { total: rt, published: rp },
      songs: { total: st, published: sp },
      videos: { total: vt, published: vp },
      products: { total: pt, published: pp },
    };
  },
});

/* -------------------------------- Commerce -------------------------------- */

export type OrderLite = {
  id: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  fulfillment_status: string | null;
  items: unknown;
  created_at: string;
};

export type BestSeller = { name: string; qty: number; value: number };

export type CommerceStats = {
  orders: OrderLite[];
  truncated: boolean;
  total: number;
  paid: number;
  refunded: number;
  cancelled: number;
  grossValue: number;
  paidValue: number;
  avgOrderValue: number;
  itemsSold: number;
  currency: string;
  bestSellers: BestSeller[];
};

export function commerceQueryOptions(range: RangeValue) {
  return queryOptions({
    queryKey: ["admin", "analytics", "commerce", range],
    queryFn: async (): Promise<CommerceStats> => {
      let q = supabase
        .from("orders")
        .select("id, email, amount, currency, status, fulfillment_status, items, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);
      const from = rangeStart(range);
      if (from) q = q.gte("created_at", from);
      const { data, error } = await q;
      if (error) throw error;
      const orders = (data ?? []) as OrderLite[];

      const paidOrders = orders.filter((o) => o.status === "paid");
      const grossValue = paidOrders.reduce((s, o) => s + Number(o.amount ?? 0), 0);
      const sellers = new Map<string, BestSeller>();
      let itemsSold = 0;
      for (const o of paidOrders) {
        for (const it of orderItems(o.items)) {
          const name = it.name ?? it.title ?? "Unbenannte Position";
          const qty = itemQty(it);
          const value = itemTotal(it) || itemUnitPrice(it) * qty;
          itemsSold += qty;
          const cur = sellers.get(name) ?? { name, qty: 0, value: 0 };
          cur.qty += qty;
          cur.value += value;
          sellers.set(name, cur);
        }
      }

      return {
        orders,
        truncated: orders.length >= MAX_ROWS,
        total: orders.length,
        paid: paidOrders.length,
        refunded: orders.filter((o) => o.status === "refunded").length,
        cancelled: orders.filter((o) => o.fulfillment_status === "storniert").length,
        grossValue,
        paidValue: grossValue,
        avgOrderValue: paidOrders.length ? grossValue / paidOrders.length : 0,
        itemsSold,
        currency: orders[0]?.currency ?? "EUR",
        bestSellers: [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
      };
    },
  });
}

/* -------------------------------- Audience -------------------------------- */

export type AudienceStats = {
  fans: number;
  customers: number;
  subscribers: number;
  unsubscribed: number;
  customersWithNewsletter: number | null;
  signups: { created_at: string; status: string }[];
};

export function audienceQueryOptions(range: RangeValue) {
  return queryOptions({
    queryKey: ["admin", "analytics", "audience", range],
    queryFn: async (): Promise<AudienceStats> => {
      const from = rangeStart(range);

      const fansTotal = async (filter: string) => {
        const { data, error } = await supabase.rpc("admin_list_fans", {
          _search: "",
          _filter: filter,
          _limit: 1,
          _offset: 0,
        });
        if (error) throw error;
        const rows = (data ?? []) as unknown as { total_count: number }[];
        return rows[0] ? Number(rows[0].total_count) : 0;
      };

      const subCount = async (status?: string) => {
        let q = supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true });
        if (status) q = q.eq("status", status);
        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      };

      let sq = supabase
        .from("newsletter_subscribers")
        .select("created_at, status")
        .order("created_at", { ascending: true })
        .limit(MAX_ROWS);
      if (from) sq = sq.gte("created_at", from);

      const [fans, customers, subscribers, unsubscribed, signupsRes] = await Promise.all([
        fansTotal("all"),
        fansTotal("customers"),
        subCount("subscribed"),
        subCount("unsubscribed"),
        sq,
      ]);
      if (signupsRes.error) throw signupsRes.error;

      // Überschneidung Kunde × Newsletter: nur berechnen, wenn die Kundenzahl klein genug
      // ist, um sie gebündelt zu laden. Sonst bewusst „nicht verfügbar“.
      let overlap: number | null = null;
      if (customers > 0 && customers <= 500) {
        const { data, error } = await supabase.rpc("admin_list_fans", {
          _search: "",
          _filter: "customers",
          _limit: 500,
          _offset: 0,
        });
        if (error) throw error;
        const rows = (data ?? []) as unknown as { newsletter_status: string | null }[];
        overlap = rows.filter((r) => r.newsletter_status === "subscribed").length;
      } else if (customers === 0) {
        overlap = 0;
      }

      return {
        fans,
        customers,
        subscribers,
        unsubscribed,
        customersWithNewsletter: overlap,
        signups: (signupsRes.data ?? []) as { created_at: string; status: string }[],
      };
    },
  });
}

/* -------------------------- Release-Performance --------------------------- */

export type ReleasePerf = {
  id: string;
  title: string;
  slug: string | null;
  type: string;
  release_date: string;
  tracks: number;
  songs: number;
  videos: number;
  products: number;
};

export const releasePerformanceQueryOptions = queryOptions({
  queryKey: ["admin", "analytics", "release-performance"],
  queryFn: async (): Promise<ReleasePerf[]> => {
    const [rel, songs, videos, products] = await Promise.all([
      supabase
        .from("releases")
        .select("id, title, slug, type, release_date, tracks")
        .eq("status", "Veröffentlicht")
        .order("release_date", { ascending: false }),
      supabase.from("songs").select("id, release_id").eq("status", "Veröffentlicht"),
      supabase.from("videos").select("id, release_id").eq("status", "Veröffentlicht"),
      supabase.from("products").select("id, release_id").eq("status", "Veröffentlicht"),
    ]);
    for (const r of [rel, songs, videos, products]) if (r.error) throw r.error;
    const count = (rows: { release_id: string | null }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.release_id === id).length;
    return (rel.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      type: r.type,
      release_date: r.release_date,
      tracks: r.tracks,
      songs: count(songs.data as { release_id: string | null }[], r.id),
      videos: count(videos.data as { release_id: string | null }[], r.id),
      products: count(products.data as { release_id: string | null }[], r.id),
    }));
  },
});

/* ----------------------------- Letzte Aktivität ---------------------------- */

export type ActivityItem = { at: string; kind: string; label: string; detail?: string };

export function activityQueryOptions(range: RangeValue) {
  return queryOptions({
    queryKey: ["admin", "analytics", "activity", range],
    queryFn: async (): Promise<ActivityItem[]> => {
      const from = rangeStart(range);
      const withRange = <T extends { gte: (c: string, v: string) => T }>(q: T, col: string) =>
        from ? q.gte(col, from) : q;

      const [orders, subs, releases, songs, videos, products] = await Promise.all([
        withRange(
          supabase.from("orders").select("id, email, amount, currency, status, created_at").order("created_at", { ascending: false }).limit(15) as never,
          "created_at",
        ) as unknown as Promise<{ data: { id: string; email: string; amount: number; currency: string; status: string; created_at: string }[] | null; error: unknown }>,
        withRange(
          supabase.from("newsletter_subscribers").select("email, created_at, status").order("created_at", { ascending: false }).limit(15) as never,
          "created_at",
        ) as unknown as Promise<{ data: { email: string; created_at: string; status: string }[] | null; error: unknown }>,
        withRange(
          supabase.from("releases").select("title, updated_at").eq("status", "Veröffentlicht").order("updated_at", { ascending: false }).limit(10) as never,
          "updated_at",
        ) as unknown as Promise<{ data: { title: string; updated_at: string }[] | null; error: unknown }>,
        withRange(
          supabase.from("songs").select("title, updated_at").eq("status", "Veröffentlicht").order("updated_at", { ascending: false }).limit(10) as never,
          "updated_at",
        ) as unknown as Promise<{ data: { title: string; updated_at: string }[] | null; error: unknown }>,
        withRange(
          supabase.from("videos").select("title, updated_at").eq("status", "Veröffentlicht").order("updated_at", { ascending: false }).limit(10) as never,
          "updated_at",
        ) as unknown as Promise<{ data: { title: string; updated_at: string }[] | null; error: unknown }>,
        withRange(
          supabase.from("products").select("name, updated_at").eq("status", "Veröffentlicht").order("updated_at", { ascending: false }).limit(10) as never,
          "updated_at",
        ) as unknown as Promise<{ data: { name: string; updated_at: string }[] | null; error: unknown }>,
      ]);

      const items: ActivityItem[] = [];
      for (const o of orders.data ?? []) {
        items.push({
          at: o.created_at,
          kind: o.status === "paid" ? "Bestellung bezahlt" : "Bestellung eingegangen",
          label: `#${o.id.slice(0, 8).toUpperCase()}`,
          detail: `${Number(o.amount).toFixed(2)} ${o.currency}`,
        });
      }
      for (const s of subs.data ?? []) {
        items.push({
          at: s.created_at,
          kind: s.status === "subscribed" ? "Newsletter-Anmeldung" : "Newsletter-Eintrag",
          label: s.email,
        });
      }
      for (const r of releases.data ?? []) items.push({ at: r.updated_at, kind: "Release veröffentlicht", label: r.title });
      for (const s of songs.data ?? []) items.push({ at: s.updated_at, kind: "Song veröffentlicht", label: s.title });
      for (const v of videos.data ?? []) items.push({ at: v.updated_at, kind: "Video veröffentlicht", label: v.title });
      for (const p of products.data ?? []) items.push({ at: p.updated_at, kind: "Produkt veröffentlicht", label: p.name });

      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
    },
  });
}

/* ------------------------------ Zeitreihen -------------------------------- */

export type SeriesPoint = { key: string; label: string; orders: number; value: number; signups: number };

const pad = (n: number) => String(n).padStart(2, "0");

function bucketKey(iso: string, bucket: "day" | "month") {
  const d = new Date(iso);
  return bucket === "month"
    ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
    : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function bucketLabel(key: string, bucket: "day" | "month") {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return bucket === "month"
    ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" })
    : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Vollständiges Raster, damit auch leere und einpunktige Datensätze korrekt zeichnen. */
export function buildSeries(
  range: RangeValue,
  orders: { created_at: string; amount: number; status: string }[],
  signups: { created_at: string }[],
): SeriesPoint[] {
  const bucket = rangeBucket(range);
  const keys: string[] = [];
  const start = rangeStart(range);

  if (start) {
    const cursor = new Date(start);
    const end = new Date();
    if (bucket === "month") {
      cursor.setUTCDate(1);
      while (cursor <= end) {
        keys.push(`${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      while (cursor <= end) {
        keys.push(bucketKey(cursor.toISOString(), "day"));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
  } else {
    const all = new Set<string>();
    for (const o of orders) all.add(bucketKey(o.created_at, bucket));
    for (const s of signups) all.add(bucketKey(s.created_at, bucket));
    keys.push(...[...all].sort());
  }

  const map = new Map<string, SeriesPoint>(
    keys.map((k) => [k, { key: k, label: bucketLabel(k, bucket), orders: 0, value: 0, signups: 0 }]),
  );
  for (const o of orders) {
    const p = map.get(bucketKey(o.created_at, bucket));
    if (!p) continue;
    p.orders += 1;
    if (o.status === "paid") p.value += Number(o.amount ?? 0);
  }
  for (const s of signups) {
    const p = map.get(bucketKey(s.created_at, bucket));
    if (p) p.signups += 1;
  }
  return [...map.values()];
}

/* --------------------------------- Export --------------------------------- */

export function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0] as Record<string, string | number>);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c] ?? "")).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
