import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  AdminError,
  AdminNotice,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminPageHeader";
import {
  AUDIENCE_PAGE_SIZE,
  NEWSLETTER_FILTERS,
  downloadCsv,
  formatDateTime,
  newsletterStatsQueryOptions,
  setSubscriberStatus,
  subscribersQueryOptions,
  toCsv,
  type NewsletterFilter,
  type SubscriberRow,
} from "@/lib/admin/audience";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: AdminNewsletter,
});

function AdminNewsletter() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NewsletterFilter>("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ row: SubscriberRow; next: "subscribed" | "unsubscribed" } | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = useQuery(newsletterStatsQueryOptions());
  const query = useQuery({
    ...subscribersQueryOptions({ search, filter, source, page }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / AUDIENCE_PAGE_SIZE));

  const confirmChange = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await setSubscriberStatus(pending.row.id, pending.next);
      await qc.invalidateQueries({ queryKey: ["admin", "newsletter"] });
      toast.success(
        pending.next === "subscribed" ? "Abonnent wieder angemeldet." : "Abonnent abgemeldet.",
      );
      setPending(null);
    } catch {
      toast.error("Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      "tayo-newsletter.csv",
      toCsv(
        rows.map((s) => ({
          email: s.email,
          status: s.status,
          quelle: s.source ?? "",
          einwilligung: s.consent_at ?? "",
          abgemeldet: s.unsubscribed_at ?? "",
          erstellt: s.created_at,
        })),
      ),
    );
  };

  return (
    <>
      <AdminPageHeader
        title="Newsletter"
        description="Abonnenten mit expliziter Einwilligung — getrennt von Fan-Accounts und Bestellungen."
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
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Abonnenten</p>
          <p className="mt-1 text-2xl font-bold">{stats.isLoading ? "…" : (stats.data?.total ?? 0)}</p>
        </div>
        <div className="glass rounded-2xl border border-border/60 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aktiv</p>
          <p className="mt-1 text-2xl font-bold">{stats.isLoading ? "…" : (stats.data?.active ?? 0)}</p>
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
            placeholder="E-Mail suchen"
            className="w-full rounded-full border border-border/60 bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-foreground/40"
          />
        </label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {NEWSLETTER_FILTERS.map((f) => (
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
          {(stats.data?.sources.length ?? 0) > 1 && (
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(0);
              }}
              className="shrink-0 rounded-full border border-border/60 bg-transparent px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground"
            >
              <option value="all">Alle Quellen</option>
              {stats.data?.sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {query.isLoading ? (
        <AdminSkeleton rows={5} />
      ) : query.isError ? (
        <AdminError
          message="Abonnenten konnten nicht geladen werden."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <AdminNotice
          title={search || filter !== "all" ? "Keine Treffer" : "Keine Newsletter-Abonnenten vorhanden"}
          description={
            search || filter !== "all"
              ? "Passe Suche oder Filter an."
              : "Anmeldungen über das Formular auf der Website erscheinen hier."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((sub) => (
            <li
              key={sub.id}
              className="glass flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{sub.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Einwilligung: {formatDateTime(sub.consent_at)} · Quelle: {sub.source ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Erstellt: {formatDateTime(sub.created_at)} · Aktualisiert:{" "}
                  {formatDateTime(sub.updated_at)}
                  {sub.unsubscribed_at ? ` · Abgemeldet: ${formatDateTime(sub.unsubscribed_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px] uppercase tracking-widest",
                    sub.status === "subscribed"
                      ? "border-[color:var(--accent-base)]/50 text-[color:var(--accent-base)]"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {sub.status === "subscribed" ? "Angemeldet" : "Abgemeldet"}
                </span>
                <button
                  onClick={() =>
                    setPending({
                      row: sub,
                      next: sub.status === "subscribed" ? "unsubscribed" : "subscribed",
                    })
                  }
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  {sub.status === "subscribed" ? "Abmelden" : "Anmelden"}
                </button>
              </div>
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

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl border border-border/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">
              Einwilligung ändern
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {pending.next === "unsubscribed"
                ? `${pending.row.email} wird abgemeldet und erhält keine Newsletter mehr.`
                : `${pending.row.email} wird wieder angemeldet. Tue dies nur mit dokumentierter Einwilligung — der Zeitpunkt wird neu gesetzt.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPending(null)}
                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground"
              >
                Abbrechen
              </button>
              <button
                disabled={busy}
                onClick={() => void confirmChange()}
                className="rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-widest text-background disabled:opacity-50"
              >
                {busy ? "…" : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
