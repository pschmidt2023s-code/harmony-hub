import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type OrderItem = { title?: string; name?: string; qty?: number; quantity?: number; price?: number };

type Order = {
  id: string;
  email: string | null;
  amount: number;
  currency: string;
  status: string;
  items: unknown;
  shipping: unknown;
  paypal_order_id: string | null;
  created_at: string;
};

const STATUSES = ["pending", "paid", "versendet", "storniert"] as const;

const money = (v: number, c: string) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: c || "EUR" }).format(v);

export function OrdersPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("alle");

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, amount, currency, status, items, shipping, paypal_order_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = filter === "alle" ? orders : orders.filter((o) => o.status === filter);
  const revenue = orders.filter((o) => o.status !== "storniert").reduce((s, o) => s + Number(o.amount || 0), 0);

  const exportCsv = () => {
    const rows = [
      ["ID", "Datum", "E-Mail", "Betrag", "Währung", "Status", "PayPal-ID"],
      ...orders.map((o) => [
        o.id,
        new Date(o.created_at).toLocaleString("de-DE"),
        o.email ?? "",
        String(o.amount),
        o.currency,
        o.status,
        o.paypal_order_id ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tayo-bestellungen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Package className="size-4 text-primary" /> Bestellungen
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refetch()}
            className="rounded-full border border-border p-2 text-muted-foreground hover:text-primary"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </button>
          <button
            onClick={exportCsv}
            className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            CSV-Export
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {orders.length} Bestellungen · Umsatz {money(revenue, orders[0]?.currency ?? "EUR")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["alle", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] capitalize transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Lade…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Keine Bestellungen in dieser Ansicht.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {visible.map((o) => {
            const items = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
            return (
              <li key={o.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.email ?? "Ohne E-Mail"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("de-DE")} · {money(Number(o.amount), o.currency)}
                    </p>
                    {items.length > 0 && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {items
                          .map((i) => `${i.qty ?? i.quantity ?? 1}× ${i.title ?? i.name ?? "Artikel"}`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })}
                    className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    {[...new Set([o.status, ...STATUSES])].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
