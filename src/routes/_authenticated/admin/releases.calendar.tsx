import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { Countdown, ReadinessBadge, ReleaseDetailDrawer } from "@/components/admin/releases/planning";
import {
  adminReleasesQueryOptions,
  adminSongsQueryOptions,
  adminVideosQueryOptions,
  RELEASE_TYPES,
  type ReleaseRow,
} from "@/lib/admin/releases";
import {
  effectiveDate,
  formatDateTime,
  hasExactTime,
  isPublicNow,
  isUpcoming,
  localTimezone,
  monthGrid,
  PIPELINE_STAGES,
  releaseReadiness,
  releaseSongs,
  sameDay,
  stageOf,
  type ReleaseContext,
  type StageId,
} from "@/lib/admin/pipeline";

export const Route = createFileRoute("/_authenticated/admin/releases/calendar")({
  component: CalendarPage,
});

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(d);
}

function CalendarPage() {
  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);
  const videos = useQuery(adminVideosQueryOptions);

  const [view, setView] = useState<"month" | "agenda">("month");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [stageFilter, setStageFilter] = useState<StageId | "alle">("alle");
  const [type, setType] = useState("alle");
  const [detail, setDetail] = useState<ReleaseRow | null>(null);

  const ctx = { songs: songs.data ?? [], videos: videos.data ?? [] };

  const events = useMemo(() => {
    let list = releases.data ?? [];
    if (stageFilter !== "alle") list = list.filter((r) => stageOf(r) === stageFilter);
    if (type !== "alle") list = list.filter((r) => r.type === type);
    return [...list].sort((a, b) => effectiveDate(a).getTime() - effectiveDate(b).getTime());
  }, [releases.data, stageFilter, type]);

  const upcoming = useMemo(() => events.filter((r) => isUpcoming(r)), [events]);
  const past = useMemo(() => [...events].filter((r) => !isUpcoming(r)).reverse(), [events]);

  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const isLoading = releases.isLoading || songs.isLoading || videos.isLoading;
  const error = releases.error || songs.error || videos.error;

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Release Calendar"
        description={`Zeitplan aller geplanten und veröffentlichten Releases. Alle Zeiten in ${localTimezone()}.`}
        action={
          <Link
            to="/admin/releases/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" /> Neues Release
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="glass flex items-center gap-1 rounded-xl p-1">
          {(["month", "agenda"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-xs ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v === "month" ? "Monat" : "Agenda"}
            </button>
          ))}
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as StageId | "alle")}
          className="glass rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Stufen</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="glass rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Typen</option>
          {RELEASE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <AdminSkeleton rows={4} />}
      {error && (
        <AdminError
          message="Kalender konnte nicht geladen werden."
          onRetry={() => {
            void releases.refetch();
            void songs.refetch();
            void videos.refetch();
          }}
        />
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {view === "month" && (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <button onClick={() => shift(-1)} className="glass rounded-full p-2 hover:text-primary">
                    <ChevronLeft className="size-4" />
                  </button>
                  <p className="text-sm font-semibold">{monthLabel(cursor)}</p>
                  <button onClick={() => shift(1)} className="glass rounded-full p-2 hover:text-primary">
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                    className="glass ml-auto rounded-full px-4 py-1.5 text-xs hover:text-primary"
                  >
                    Heute
                  </button>
                </div>

                {/* Monatsraster nur ab sm – auf Mobil ist die Agenda die Hauptansicht */}
                <div className="hidden sm:block">
                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                    {WEEKDAYS.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {grid.map((day) => {
                      const dayEvents = events.filter((r) => sameDay(effectiveDate(r), day));
                      const inMonth = day.getMonth() === cursor.getMonth();
                      const today = sameDay(day, new Date());
                      return (
                        <div
                          key={day.toISOString()}
                          className={`glass min-h-24 rounded-xl p-1.5 ${inMonth ? "" : "opacity-40"} ${
                            today ? "ring-1 ring-primary/60" : ""
                          }`}
                        >
                          <p className="px-1 text-[11px] text-muted-foreground">{day.getDate()}</p>
                          <div className="mt-1 grid gap-1">
                            {dayEvents.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => setDetail(r)}
                                className="flex w-full min-w-0 items-center gap-1.5 rounded-lg bg-background/40 p-1 text-left"
                                title={`${r.title} · ${r.status}`}
                              >
                                <img
                                  src={r.cover_url || "/icons/icon-192.png"}
                                  alt=""
                                  loading="lazy"
                                  className="size-6 shrink-0 rounded object-cover"
                                />
                                <span className="min-w-0">
                                  <span
                                    className={`block truncate text-[10px] ${
                                      isPublicNow(r) ? "text-primary" : "text-foreground"
                                    }`}
                                  >
                                    {r.title}
                                  </span>
                                  <span className="block truncate text-[9px] text-muted-foreground">
                                    {hasExactTime(r)
                                      ? new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(
                                          effectiveDate(r),
                                        )
                                      : r.type}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:hidden">
                  <AgendaList
                    items={events.filter(
                      (r) =>
                        effectiveDate(r).getMonth() === cursor.getMonth() &&
                        effectiveDate(r).getFullYear() === cursor.getFullYear(),
                    )}
                    ctx={ctx}
                    onOpen={setDetail}
                    emptyText="Keine Releases in diesem Monat"
                  />
                </div>
              </>
            )}

            {view === "agenda" && (
              <div className="grid gap-6">
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]">Kommend</h2>
                  <AgendaList
                    items={upcoming}
                    ctx={ctx}
                    onOpen={setDetail}
                    emptyText="Keine kommenden Releases"
                  />
                </div>
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]">Vergangen</h2>
                  <AgendaList
                    items={past}
                    ctx={ctx}
                    onOpen={setDetail}
                    emptyText="Keine Releases vorhanden"
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]">Nächste Releases</h2>
            {upcoming.length === 0 ? (
              <p className="glass rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">
                Keine kommenden Releases
              </p>
            ) : (
              <div className="grid gap-3">
                {upcoming.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="glass min-w-0 rounded-2xl p-4 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={r.cover_url || "/icons/icon-192.png"}
                        alt=""
                        loading="lazy"
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold uppercase">{r.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.type} · {releaseSongs(r, ctx.songs).length} Tracks · {r.status}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {hasExactTime(r) ? formatDateTime(effectiveDate(r)) : r.release_date}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Countdown target={effectiveDate(r)} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {detail && <ReleaseDetailDrawer release={detail} ctx={ctx} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AgendaList({
  items,
  ctx,
  onOpen,
  emptyText,
}: {
  items: ReleaseRow[];
  ctx: ReleaseContext;
  onOpen: (r: ReleaseRow) => void;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="glass rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
    );
  }
  return (
    <div className="grid gap-3">
      {items.map((r) => {
        const readiness = releaseReadiness(r, ctx);
        const when = effectiveDate(r);
        return (
          <div key={r.id} className="glass min-w-0 rounded-2xl p-4">
            <button onClick={() => onOpen(r)} className="flex w-full min-w-0 items-center gap-3 text-left">
              <img
                src={r.cover_url || "/icons/icon-192.png"}
                alt=""
                loading="lazy"
                className="size-12 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold uppercase">{r.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {r.type} · {hasExactTime(r) ? formatDateTime(when) : r.release_date}
                </span>
              </span>
              <span className="hidden sm:block">
                <ReadinessBadge readiness={readiness} />
              </span>
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                  isPublicNow(r) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {isPublicNow(r) ? "Live" : r.status}
              </span>
              {stageOf(r) === "archived" && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  Archiviert — nicht öffentlich
                </span>
              )}
              <Link
                to="/admin/releases/$id/edit"
                params={{ id: r.id }}
                className="glass rounded-full px-3 py-1.5 text-[11px] hover:text-primary"
              >
                Bearbeiten
              </Link>
              <Link
                to="/admin/releases/$id/preview"
                params={{ id: r.id }}
                className="glass rounded-full px-3 py-1.5 text-[11px] hover:text-primary"
              >
                Vorschau
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
