import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminNotice, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  adminOrderDetailQueryOptions,
  adminOrdersQueryOptions,
  CRITICAL_FULFILLMENT,
  FULFILLMENT_STATUSES,
  itemQty,
  itemTotal,
  itemUnitPrice,
  orderItems,
  orderNumber,
  PAYMENT_STATUSES,
  paymentLabel,
  setFulfillmentStatus,
  type FulfillmentStatus,
  type OrderRow,
  type ShippingInfo,
} from "@/lib/admin/orders";
import { money } from "@/lib/shop";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export function OrdersPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("alle");
  const [fulfillment, setFulfillment] = useState("alle");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; next: FulfillmentStatus } | null>(null);

  const list = useQuery(adminOrdersQueryOptions({ search, payment, fulfillment, page, pageSize: PAGE_SIZE }));
  const detail = useQuery(adminOrderDetailQueryOptions(openId));

  const change = useMutation({
    mutationFn: ({ id, next }: { id: string; next: FulfillmentStatus }) => setFulfillmentStatus(id, next),
    onSuccess: () => {
      toast.success("Bearbeitungsstatus aktualisiert");
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      void qc.invalidateQueries({ queryKey: ["admin", "order"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apply = (id: string, next: FulfillmentStatus) => {
    if (CRITICAL_FULFILLMENT.includes(next)) setConfirm({ id, next });
    else change.mutate({ id, next });
  };

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass flex min-w-[220px] flex-1 items-center gap-2 rounded-full px-4 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Bestellnummer, Name oder E-Mail"
            aria-label="Bestellungen durchsuchen"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={payment}
          onChange={(e) => {
            setPayment(e.target.value);
            setPage(0);
          }}
          aria-label="Zahlungsstatus"
          className="glass rounded-full px-4 py-2 text-xs outline-none"
        >
          <option value="alle">Zahlung: alle</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {paymentLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={fulfillment}
          onChange={(e) => {
            setFulfillment(e.target.value);
            setPage(0);
          }}
          aria-label="Bearbeitungsstatus"
          className="glass rounded-full px-4 py-2 text-xs outline-none"
        >
          <option value="alle">Bearbeitung: alle</option>
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {list.isLoading ? (
        <AdminSkeleton rows={4} />
      ) : list.error ? (
        <AdminError message="Bestellungen konnten nicht geladen werden." onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <AdminNotice
          title={search || payment !== "alle" || fulfillment !== "alle" ? "Keine Treffer" : "Keine Bestellungen vorhanden"}
          description={
            search || payment !== "alle" || fulfillment !== "alle"
              ? "Andere Suche oder andere Filter ausprobieren."
              : "Sobald eine Bestellung eingeht, erscheint sie hier."
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((o) => (
              <li key={o.id} className="glass rounded-2xl p-4">
                <button
                  onClick={() => setOpenId(o.id)}
                  className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {orderNumber(o.id)} · {o.email ?? "Ohne E-Mail"}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{new Date(o.created_at).toLocaleString("de-DE")}</span>
                      <span>{orderItems(o.items).reduce((n, i) => n + itemQty(i), 0)} Artikel</span>
                      <span>{money(Number(o.amount), o.currency)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px]",
                        o.status === "paid" ? "bg-primary/15 text-primary" : "border border-border text-muted-foreground",
                      )}
                    >
                      {paymentLabel(o.status)}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                      {o.fulfillment_status}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} von {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-full border border-border px-4 py-1.5 disabled:opacity-40"
              >
                Zurück
              </button>
              <button
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border px-4 py-1.5 disabled:opacity-40"
              >
                Weiter
              </button>
            </div>
          </div>
        </>
      )}

      {openId && (
        <OrderDetail
          order={detail.data ?? null}
          loading={detail.isLoading}
          onClose={() => setOpenId(null)}
          onStatus={(next) => apply(openId, next)}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" /> Bearbeitungsstatus ändern
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Bestellung {orderNumber(confirm.id)} auf <span className="text-foreground">{confirm.next}</span> setzen?
              Der Zahlungsstatus bleibt davon unberührt.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
              >
                Abbrechen
              </button>
              <button
                onClick={() => change.mutate(confirm)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetail({
  order,
  loading,
  onClose,
  onStatus,
}: {
  order: OrderRow | null;
  loading: boolean;
  onClose: () => void;
  onStatus: (next: FulfillmentStatus) => void;
}) {
  const shipping = (order?.shipping ?? {}) as ShippingInfo;
  const items = orderItems(order?.items);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70">
      <div className="glass-strong h-full w-full max-w-lg overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{order ? orderNumber(order.id) : "Bestellung"}</p>
            {order && (
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString("de-DE")}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Schließen" className="rounded-full border border-border p-2">
            <X className="size-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="mt-6">
            <AdminSkeleton rows={3} />
          </div>
        ) : !order ? (
          <p className="mt-6 text-sm text-muted-foreground">Bestellung nicht gefunden.</p>
        ) : (
          <div className="mt-6 space-y-6 text-sm">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Bestellung</h3>
              <dl className="mt-2 space-y-1">
                <Row label="Zahlungsstatus" value={paymentLabel(order.status)} />
                <Row label="Bearbeitung" value={order.fulfillment_status} />
                <Row label="Summe" value={money(Number(order.amount), order.currency)} />
                <Row label="Währung" value={order.currency} />
              </dl>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Kunde</h3>
              <dl className="mt-2 space-y-1">
                <Row label="Name" value={shipping.name ?? "—"} />
                <Row label="E-Mail" value={order.email ?? "—"} />
                <Row label="Konto" value={order.user_id ? "Registriert" : "Gastbestellung"} />
              </dl>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Positionen</h3>
              {items.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Keine Positionen gespeichert.</p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {items.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate">{i.name ?? i.title ?? "Artikel"}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.variant ?? "—"} · {itemQty(i)} × {money(itemUnitPrice(i), order.currency)}
                        </p>
                      </div>
                      <span className="shrink-0 text-primary">{money(itemTotal(i), order.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Zahlung</h3>
              <dl className="mt-2 space-y-1">
                <Row label="Anbieter" value="PayPal" />
                <Row label="Referenz" value={order.paypal_order_id ?? "—"} />
                <Row label="Status" value={paymentLabel(order.status)} />
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Der Zahlungsstatus wird ausschließlich vom Zahlungsanbieter gesetzt und ist hier nicht änderbar.
              </p>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Bearbeitungsstatus ändern
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {FULFILLMENT_STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={s === order.fulfillment_status}
                    onClick={() => onStatus(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px]",
                      s === order.fulfillment_status
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Bestellungen sind Belege und können nicht gelöscht werden.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm">{value}</dd>
    </div>
  );
}
