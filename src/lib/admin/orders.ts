import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

/**
 * Zahlungsstatus und Bearbeitungsstatus sind bewusst getrennt.
 * Der Zahlungsstatus (`status`) wird ausschließlich vom Zahlungsanbieter gesetzt
 * und ist im Admin nicht manuell änderbar.
 */
export const PAYMENT_STATUSES = ["created", "paid", "failed", "refunded"] as const;
export const PAYMENT_LABELS: Record<string, string> = {
  created: "Offen",
  pending: "Offen",
  paid: "Bezahlt",
  failed: "Fehlgeschlagen",
  voided: "Fehlgeschlagen",
  refunded: "Erstattet",
};

export const FULFILLMENT_STATUSES = ["offen", "in Bearbeitung", "abgeschlossen", "storniert", "erstattet"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/** Statuswechsel, die eine ausdrückliche Bestätigung erfordern. */
export const CRITICAL_FULFILLMENT: FulfillmentStatus[] = ["abgeschlossen", "storniert", "erstattet"];

export const paymentLabel = (s: string) => PAYMENT_LABELS[s] ?? s;

export type OrderItem = {
  id?: string;
  name?: string;
  title?: string;
  variant?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  total?: number;
};

export type ShippingInfo = { name?: string; street?: string; zip?: string; city?: string; country?: string };

export const orderItems = (raw: unknown): OrderItem[] => (Array.isArray(raw) ? (raw as OrderItem[]) : []);
export const itemQty = (i: OrderItem) => i.qty ?? i.quantity ?? 1;
export const itemUnitPrice = (i: OrderItem) => i.unitPrice ?? i.price ?? 0;
export const itemTotal = (i: OrderItem) => i.total ?? itemUnitPrice(i) * itemQty(i);
export const orderNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export type OrderQuery = {
  search: string;
  payment: string;
  fulfillment: string;
  page: number;
  pageSize: number;
};

/**
 * Datenbankgestützte Suche, Filterung und Seitenblätterung.
 * Es werden nur Listenfelder geladen — Positionen erst im Detail.
 */
export function adminOrdersQueryOptions(q: OrderQuery) {
  return queryOptions({
    queryKey: ["admin", "orders", q],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("id, email, amount, currency, status, fulfillment_status, items, created_at, user_id", {
          count: "exact",
        })
        .order("created_at", { ascending: false });

      const term = q.search.trim();
      if (term) {
        const like = `%${term}%`;
        const parts = [`email.ilike.${like}`, `shipping->>name.ilike.${like}`];
        // Vollständige Bestellnummer (UUID) exakt, Kurzform über Textsuche.
        if (/^[0-9a-f-]{6,}$/i.test(term.replace(/^#/, ""))) {
          parts.push(`id::text.ilike.${term.replace(/^#/, "").toLowerCase()}%`);
        }
        query = query.or(parts.join(","));
      }
      if (q.payment !== "alle") query = query.eq("status", q.payment);
      if (q.fulfillment !== "alle") query = query.eq("fulfillment_status", q.fulfillment);

      const from = q.page * q.pageSize;
      const { data, error, count } = await query.range(from, from + q.pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as OrderRow[], total: count ?? 0 };
    },
  });
}

export function adminOrderDetailQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: ["admin", "order", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as OrderRow | null;
    },
  });
}

/** Ändert ausschließlich den Bearbeitungsstatus — der Zahlungsstatus bleibt unberührt. */
export async function setFulfillmentStatus(id: string, status: FulfillmentStatus) {
  const { error } = await supabase.from("orders").update({ fulfillment_status: status }).eq("id", id);
  if (error) throw error;
}
