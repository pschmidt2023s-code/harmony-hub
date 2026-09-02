import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  fanOrdersQueryOptions,
  formatDate,
  formatDateTime,
  formatMoney,
  type FanRow,
} from "@/lib/admin/audience";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-foreground/[0.02] p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FanDetail({ fan, onClose }: { fan: FanRow; onClose: () => void }) {
  const orders = useQuery(fanOrdersQueryOptions({ id: fan.id, email: fan.email }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
      <button aria-label="Schließen" className="flex-1" onClick={onClose} />
      <aside className="glass flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border/60 p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{fan.display_name ?? "Ohne Namen"}</p>
            <p className="truncate text-sm text-muted-foreground">{fan.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Block title="Profil">
            <Row label="Name" value={fan.display_name ?? "—"} />
            <Row label="E-Mail" value={fan.email} />
            <Row label="Registriert" value={formatDateTime(fan.registered_at)} />
            <Row label="Letzte Anmeldung" value={formatDateTime(fan.last_sign_in_at)} />
            <Row label="Rolle" value={fan.is_admin ? "Admin" : "Fan"} />
          </Block>

          <Block title="Audience">
            <Row
              label="Newsletter"
              value={
                fan.newsletter_status === "subscribed"
                  ? "Angemeldet"
                  : fan.newsletter_status === "unsubscribed"
                    ? "Abgemeldet"
                    : "Kein Abo"
              }
            />
            <Row label="Einwilligung" value={formatDateTime(fan.newsletter_consent_at)} />
            <Row label="Quelle" value={fan.newsletter_source ?? "—"} />
            <p className="mt-2 text-xs text-muted-foreground">
              Fan-Account und Newsletter-Einwilligung sind getrennt — ein Account erzeugt kein Abo.
            </p>
          </Block>

          <Block title="Käufe">
            <Row label="Bestellungen" value={String(fan.order_count)} />
            <Row label="Gesamtumsatz" value={formatMoney(Number(fan.order_total))} />
            <Row label="Letzte Bestellung" value={formatDate(fan.last_order_at)} />
            <div className="mt-3 space-y-2">
              {orders.isLoading && (
                <div className="h-12 animate-pulse rounded-xl bg-foreground/5" />
              )}
              {orders.isError && (
                <p className="text-xs text-destructive">Bestellungen konnten nicht geladen werden.</p>
              )}
              {orders.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Bestellungen vorhanden.</p>
              )}
              {orders.data?.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-border/50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatDate(o.created_at)}</span>
                    <span>{formatMoney(Number(o.amount), o.currency)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">Status: {o.status}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Inhalte">
            <Row label="Favoriten" value={String(fan.favorites_count)} />
            <p className="mt-2 text-xs text-muted-foreground">
              Wunschlisten und Release-Benachrichtigungen existieren in der Datenbank noch nicht.
            </p>
          </Block>
        </div>
      </aside>
    </div>
  );
}
