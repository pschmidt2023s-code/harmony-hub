import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminOrder = {
  id: string;
  email: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type AdminSubscriber = { id: string; email: string; created_at: string };

export type ActivityEntry = {
  id: string;
  kind: "release" | "song" | "video" | "order" | "subscriber";
  label: string;
  at: string;
};

/** Bestellungen (RLS: nur Admins sehen fremde Bestellungen). */
export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, amount, currency, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminOrder[];
    },
  });
}

/** Newsletter-Abonnenten (RLS: nur Admins). */
export function useAdminSubscribers() {
  return useQuery({
    queryKey: ["admin-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminSubscriber[];
    },
  });
}

/** Reale Aktivität aus created_at-Zeitstempeln der vorhandenen Tabellen. */
export function useAdminActivity() {
  return useQuery({
    queryKey: ["admin-activity"],
    queryFn: async (): Promise<ActivityEntry[]> => {
      const [releases, songs, videos, orders, subs] = await Promise.all([
        supabase.from("releases").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("songs").select("id, title, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("videos").select("id, title, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("orders").select("id, amount, currency, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("newsletter_subscribers").select("id, email, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const firstError =
        releases.error ?? songs.error ?? videos.error ?? orders.error ?? subs.error;
      if (firstError) throw firstError;

      const entries: ActivityEntry[] = [
        ...(releases.data ?? []).map((r) => ({
          id: `release-${r.id}`,
          kind: "release" as const,
          label: `Release „${r.title}" angelegt (${r.status})`,
          at: r.created_at,
        })),
        ...(songs.data ?? []).map((s) => ({
          id: `song-${s.id}`,
          kind: "song" as const,
          label: `Song „${s.title}" hinzugefügt`,
          at: s.created_at,
        })),
        ...(videos.data ?? []).map((v) => ({
          id: `video-${v.id}`,
          kind: "video" as const,
          label: `Video „${v.title}" hinzugefügt`,
          at: v.created_at,
        })),
        ...(orders.data ?? []).map((o) => ({
          id: `order-${o.id}`,
          kind: "order" as const,
          label: `Bestellung über ${new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: o.currency || "EUR",
          }).format(Number(o.amount))}`,
          at: o.created_at,
        })),
        ...(subs.data ?? []).map((s) => ({
          id: `sub-${s.id}`,
          kind: "subscriber" as const,
          label: `Newsletter-Anmeldung: ${s.email}`,
          at: s.created_at,
        })),
      ];

      return entries.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
    },
  });
}
