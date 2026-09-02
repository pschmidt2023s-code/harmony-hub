import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, CalendarClock, Eye, Pencil, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  Countdown,
  ReadinessBadge,
  ReleaseDetailDrawer,
} from "@/components/admin/releases/planning";
import {
  adminReleasesQueryOptions,
  adminSongsQueryOptions,
  adminVideosQueryOptions,
  RELEASE_TYPES,
  saveRelease,
  type ReleaseRow,
} from "@/lib/admin/releases";
import {
  detectConflicts,
  effectiveDate,
  formatDateTime,
  hasExactTime,
  isPublicNow,
  localTimezone,
  PIPELINE_STAGES,
  releaseReadiness,
  releaseSongs,
  releaseVideos,
  stageOf,
  type ReleaseContext,
  type StageId,
} from "@/lib/admin/pipeline";

export const Route = createFileRoute("/_authenticated/admin/releases/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const qc = useQueryClient();
  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);
  const videos = useQuery(adminVideosQueryOptions);

  const [q, setQ] = useState("");
  const [type, setType] = useState("alle");
  const [stageFilter, setStageFilter] = useState<StageId | "alle">("alle");
  const [detail, setDetail] = useState<ReleaseRow | null>(null);
  const [publishing, setPublishing] = useState<ReleaseRow | null>(null);

  const ctx = { songs: songs.data ?? [], videos: videos.data ?? [] };

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    void qc.invalidateQueries({ queryKey: ["content"] });
  };

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      invalidate();
      setPublishing(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen"),
  });

  const setStatus = (r: ReleaseRow, next: string) => async () => {
    await saveRelease({ ...r, status: next }, "update");
    toast.success(`Status: ${next}`);
  };

  const schedule = (r: ReleaseRow) => {
    if (!r.publish_at) {
      toast.error("Kein Veröffentlichungszeitpunkt gesetzt — bitte im Release-Editor unter Publishing ergänzen.");
      return;
    }
    mutate.mutate(setStatus(r, "Geplant"));
  };

  const filtered = useMemo(() => {
    let list = releases.data ?? [];
    const term = q.trim().toLowerCase();
    if (term) {
      const songTitles = new Map<string, string[]>();
      for (const s of ctx.songs) {
        if (!s.release_id) continue;
        songTitles.set(s.release_id, [...(songTitles.get(s.release_id) ?? []), s.title.toLowerCase()]);
      }
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          (r.slug ?? "").toLowerCase().includes(term) ||
          r.type.toLowerCase().includes(term) ||
          (songTitles.get(r.id) ?? []).some((t) => t.includes(term)),
      );
    }
    if (type !== "alle") list = list.filter((r) => r.type === type);
    if (stageFilter !== "alle") list = list.filter((r) => stageOf(r) === stageFilter);
    return list;
  }, [releases.data, ctx.songs, q, type, stageFilter]);

  const conflicts = useMemo(
    () => detectConflicts(releases.data ?? [], ctx),
    [releases.data, ctx.songs, ctx.videos],
  );

  const isLoading = releases.isLoading || songs.isLoading || videos.isLoading;
  const error = releases.error || songs.error || videos.error;

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Release Pipeline"
        description={`Produktionsstatus aller Releases von der Idee bis zur Veröffentlichung. Zeitzone: ${localTimezone()}.`}
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
        <div className="glass flex min-w-0 flex-1 items-center gap-2 rounded-xl px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titel, Slug, Typ oder Song…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
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
          message="Pipeline konnte nicht geladen werden."
          onRetry={() => {
            void releases.refetch();
            void songs.refetch();
            void videos.refetch();
          }}
        />
      )}

      {!isLoading && !error && conflicts.length > 0 && (
        <div className="glass mb-6 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-primary" /> Planungshinweise ({conflicts.length})
          </p>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
            {conflicts.map((c, i) => (
              <li key={`${c.releaseId}-${i}`}>
                <span className="text-foreground">{c.title}</span> — {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && !error && (releases.data ?? []).length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">Keine Releases vorhanden</p>
          <Link
            to="/admin/releases/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Neues Release
          </Link>
        </div>
      )}

      {!isLoading && !error && (releases.data ?? []).length > 0 && (
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-4 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {PIPELINE_STAGES.map((stage) => {
            const items = filtered.filter((r) => stageOf(r) === stage.id);
            return (
              <section key={stage.id} className="w-[85vw] shrink-0 snap-start sm:w-72 lg:w-auto">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">{stage.label}</h2>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="grid gap-3">
                  {items.length === 0 && (
                    <p className="glass rounded-2xl px-4 py-6 text-center text-xs text-muted-foreground">
                      Keine Releases
                    </p>
                  )}
                  {items.map((r) => (
                    <PipelineCard
                      key={r.id}
                      release={r}
                      ctx={ctx}
                      onOpen={() => setDetail(r)}
                      onPublish={() => setPublishing(r)}
                      onSchedule={() => schedule(r)}
                      onOffline={() => mutate.mutate(setStatus(r, "Entwurf"))}
                      onArchive={() => mutate.mutate(setStatus(r, "Archiviert"))}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {detail && <ReleaseDetailDrawer release={detail} ctx={ctx} onClose={() => setDetail(null)} />}

      {publishing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-5 backdrop-blur">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Release veröffentlichen?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {`„${publishing.title}" wird auf „Veröffentlicht" gesetzt. Die öffentliche Sichtbarkeit richtet sich weiterhin nach der serverseitigen Logik (Release-Datum bzw. Veröffentlichungszeitpunkt).`}
            </p>
            {(() => {
              const rd = releaseReadiness(publishing, ctx);
              return rd.ready ? (
                <p className="mt-4 text-xs text-primary">Alle {rd.requiredTotal} Pflichtangaben vollständig.</p>
              ) : (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p className="text-foreground">Es fehlen noch:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {rd.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPublishing(null)} className="glass rounded-full px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                onClick={() => mutate.mutate(setStatus(publishing, "Veröffentlicht"))}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Veröffentlichen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineCard({
  release,
  ctx,
  onOpen,
  onPublish,
  onSchedule,
  onOffline,
  onArchive,
}: {
  release: ReleaseRow;
  ctx: ReleaseContext;
  onOpen: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onOffline: () => void;
  onArchive: () => void;
}) {
  const readiness = releaseReadiness(release, ctx);
  const tracks = releaseSongs(release, ctx.songs);
  const videos = releaseVideos(release, ctx.videos, ctx.songs);
  const when = effectiveDate(release);
  const future = when.getTime() > Date.now();
  const live = isPublicNow(release);
  const stage = stageOf(release);

  return (
    <article className="glass min-w-0 rounded-2xl p-4">
      <button onClick={onOpen} className="flex w-full min-w-0 items-start gap-3 text-left">
        <img
          src={release.cover_url || "/icons/icon-192.png"}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-lg object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold uppercase">{release.title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {release.type} · {tracks.length} Tracks{videos.length > 0 ? " · Video" : ""}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {hasExactTime(release) ? formatDateTime(when) : release.release_date}
          </span>
        </span>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ReadinessBadge readiness={readiness} />
        {live && <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] text-primary">Live</span>}
        {future && stage !== "archived" && <Countdown target={when} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link
          to="/admin/releases/$id/edit"
          params={{ id: release.id }}
          className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] hover:text-primary"
        >
          <Pencil className="size-3" /> Bearbeiten
        </Link>
        <Link
          to="/admin/releases/$id/preview"
          params={{ id: release.id }}
          className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] hover:text-primary"
        >
          <Eye className="size-3" /> Vorschau
        </Link>
        {stage !== "scheduled" && stage !== "published" && (
          <button
            onClick={onSchedule}
            className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] hover:text-primary"
          >
            <CalendarClock className="size-3" /> Planen
          </button>
        )}
        {stage !== "published" && (
          <button
            onClick={onPublish}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
          >
            <Upload className="size-3" /> Veröffentlichen
          </button>
        )}
        {stage === "published" && (
          <button
            onClick={onOffline}
            className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] hover:text-primary"
          >
            Offline nehmen
          </button>
        )}
        {stage !== "archived" && (
          <button
            onClick={onArchive}
            className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] hover:text-primary"
          >
            <Archive className="size-3" /> Archivieren
          </button>
        )}
      </div>
    </article>
  );
}
