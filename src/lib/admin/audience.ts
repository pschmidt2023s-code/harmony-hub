import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Audience-Layer (Phase 11).
 * Es werden ausschließlich bestehende Strukturen genutzt:
 *  - auth.users + public.profiles  -> Fans (über die Admin-Funktion admin_list_fans)
 *  - public.newsletter_subscribers -> Newsletter (eigenständige Einwilligung)
 *  - public.orders / public.favorites -> nur lesend für Beziehungen
 * Newsletter-Abo und Fan-Account bleiben bewusst getrennte Datensätze.
 */

export const AUDIENCE_PAGE_SIZE = 25;

/* ---------------------------------- Fans ---------------------------------- */

export const FAN_FILTERS = [
  { value: "all", label: "Alle Fans" },
  { value: "newsletter", label: "Newsletter abonniert" },
  { value: "no_newsletter", label: "Kein Newsletter" },
  { value: "customers", label: "Kunden" },
  { value: "non_customers", label: "Keine Kunden" },
] as const;

export type FanFilter = (typeof FAN_FILTERS)[number]["value"];

export type FanRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  registered_at: string;
  last_sign_in_at: string | null;
  order_count: number;
  order_total: number;
  last_order_at: string | null;
  favorites_count: number;
  newsletter_status: string | null;
  newsletter_consent_at: string | null;
  newsletter_source: string | null;
  is_admin: boolean;
  total_count: number;
};

export async function listFans(params: {
  search: string;
  filter: FanFilter;
  page: number;
}): Promise<{ rows: FanRow[]; total: number }> {
  const { data, error } = await supabase.rpc("admin_list_fans", {
    _search: params.search.trim(),
    _filter: params.filter,
    _limit: AUDIENCE_PAGE_SIZE,
    _offset: params.page * AUDIENCE_PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as unknown as FanRow[];
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export const fansQueryOptions = (params: { search: string; filter: FanFilter; page: number }) =>
  queryOptions({
    queryKey: ["admin", "fans", params.search.trim(), params.filter, params.page],
    queryFn: () => listFans(params),
    staleTime: 30_000,
  });

export type FanOrder = {
  id: string;
  created_at: string;
  status: string;
  amount: number;
  currency: string;
  items: unknown;
};

/** Bestelldetails werden erst beim Öffnen eines Fan-Profils geladen (nur lesend). */
export const fanOrdersQueryOptions = (fan: { id: string; email: string }) =>
  queryOptions({
    queryKey: ["admin", "fan-orders", fan.id],
    queryFn: async (): Promise<FanOrder[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, status, amount, currency, items")
        .or(`user_id.eq.${fan.id},email.eq.${fan.email}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as FanOrder[];
    },
    staleTime: 30_000,
  });

/* ------------------------------- Newsletter -------------------------------- */

export const NEWSLETTER_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "subscribed", label: "Angemeldet" },
  { value: "unsubscribed", label: "Abgemeldet" },
] as const;

export type NewsletterFilter = (typeof NEWSLETTER_FILTERS)[number]["value"];

export type SubscriberRow = {
  id: string;
  email: string;
  status: string;
  source: string | null;
  consent_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSubscribers(params: {
  search: string;
  filter: NewsletterFilter;
  source: string;
  page: number;
}): Promise<{ rows: SubscriberRow[]; total: number }> {
  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, status, source, consent_at, unsubscribed_at, created_at, updated_at", {
      count: "exact",
    });
  const search = params.search.trim();
  if (search) query = query.ilike("email", `%${search}%`);
  if (params.filter !== "all") query = query.eq("status", params.filter);
  if (params.source !== "all") {
    query = params.source === "—" ? query.is("source", null) : query.eq("source", params.source);
  }
  const from = params.page * AUDIENCE_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + AUDIENCE_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as SubscriberRow[], total: count ?? 0 };
}

export const subscribersQueryOptions = (params: {
  search: string;
  filter: NewsletterFilter;
  source: string;
  page: number;
}) =>
  queryOptions({
    queryKey: [
      "admin",
      "newsletter",
      params.search.trim(),
      params.filter,
      params.source,
      params.page,
    ],
    queryFn: () => listSubscribers(params),
    staleTime: 30_000,
  });

export const newsletterStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "newsletter", "stats"],
    queryFn: async () => {
      const [total, active, sources] = await Promise.all([
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase
          .from("newsletter_subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "subscribed"),
        supabase.from("newsletter_subscribers").select("source").limit(1000),
      ]);
      if (total.error) throw total.error;
      if (active.error) throw active.error;
      const uniqueSources = Array.from(
        new Set(((sources.data ?? []) as { source: string | null }[]).map((r) => r.source ?? "—")),
      ).sort();
      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        sources: uniqueSources,
      };
    },
    staleTime: 30_000,
  });

/** Explizite Einwilligungsänderung durch einen Admin — nie implizit. */
export async function setSubscriberStatus(id: string, status: "subscribed" | "unsubscribed") {
  const patch =
    status === "subscribed"
      ? { status, consent_at: new Date().toISOString(), unsubscribed_at: null }
      : { status, unsubscribed_at: new Date().toISOString() };
  const { error } = await supabase.from("newsletter_subscribers").update(patch).eq("id", id);
  if (error) throw error;
}

/* --------------------------------- Utils ---------------------------------- */

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { dateStyle: "medium" });
}

export function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount || 0);
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
