import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  AdminError,
  AdminNotice,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminPageHeader";
import { FanDetail } from "@/components/admin/audience/FanDetail";
import {
  AUDIENCE_PAGE_SIZE,
  FAN_FILTERS,
  downloadCsv,
  fansQueryOptions,
  formatDate,
  formatMoney,
  toCsv,
  type FanFilter,
  type FanRow,
} from "@/lib/admin/audience";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/fans")({
  component: AdminFans,
});

function AdminFans() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FanFilter>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FanRow | null>(null);

  const query = useQuery({
    ...fansQueryOptions({ search, filter, page }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / AUDIENCE_PAGE_SIZE));

  const exportCsv = () => {
    downloadCsv(
      "tayo-fans.csv",
      toCsv(
        rows.map((f) => ({
          name: f.display_name ?? "",
          email: f.email,
          registriert: f.registered_at,
          bestellungen: f.order_count,
          umsatz: Number(f.order_total),
          newsletter: f.newsletter_status ?? "kein Abo",
        })),
      ),
    );
  };

  return (
    <>
      <AdminPageHeader
        title="Fans"
        description="Registrierte Fan-Accounts mit echten Newsletter- und Bestellbeziehungen."
        action={
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            CSV Export
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl border border-border/60 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Registrierte Fans
          </p>
          <p className="mt-1 text-2xl font-bold">{query.isLoading ? "…" : total}</p>
        </div>
        <div className="glass rounded-2xl border border-border/60 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ansicht</p>
          <p className="mt-1 text-2xl font-bold">
            {FAN_FILTERS.find((f) => f.value === filter)?.label}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Name oder E-Mail suchen"
            className="w-full rounded-full border border-border/60 bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-foreground/40"
          />
        </label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FAN_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(0);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
                filter === f.value
                  ? "border-transparent bg-foreground text-background"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <AdminSkeleton rows={5} />
      ) : query.isError ? (
        <AdminError
          message="Fans konnten nicht geladen werden."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <AdminNotice
          title={search || filter !== "all" ? "Keine Treffer" : "Keine Fans vorhanden"}
          description={
            search || filter !== "all"
              ? "Passe Suche oder Filter an."
              : "Sobald sich Fans registrieren, erscheinen sie hier."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((fan) => (
            <li key={fan.id}>
              <button
                onClick={() => setSelected(fan)}
                className="glass flex w-full flex-col gap-3 rounded-2xl border border-border/60 p-4 text-left transition-colors hover:border-foreground/30 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {fan.avatar_url ? (
                    <img
                      src={fan.avatar_url}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold">
                      {(fan.display_name ?? fan.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {fan.display_name ?? "Ohne Namen"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{fan.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest">
                  <span className="rounded-full border border-border/60 px-2 py-1 text-muted-foreground">
                    seit {formatDate(fan.registered_at)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-1",
                      fan.newsletter_status === "subscribed"
                        ? "border-[color:var(--accent-base)]/50 text-[color:var(--accent-base)]"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {fan.newsletter_status === "subscribed"
                      ? "Newsletter"
                      : fan.newsletter_status === "unsubscribed"
                        ? "abgemeldet"
                        : "kein Abo"}
                  </span>
                  <span className="rounded-full border border-border/60 px-2 py-1 text-muted-foreground">
                    {fan.order_count > 0
                      ? `${fan.order_count} × ${formatMoney(Number(fan.order_total))}`
                      : "kein Kunde"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
          >
            Zurück
          </button>
          <span>
            Seite {page + 1} / {pages}
          </span>
          <button
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
          >
            Weiter
          </button>
        </div>
      )}

      {selected && <FanDetail fan={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
