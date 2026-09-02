import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Eye, Pencil, Plus, Search, Upload, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { adminReleasesQueryOptions, adminSongsQueryOptions } from "@/lib/admin/releases";
import {
  adminVideoListQueryOptions,
  newVideoId,
  saveVideo,
  setVideoStatus,
  sourceLabel,
  uniqueVideoSlug,
  videoAvailability,
  VIDEO_SOURCES,
  VIDEO_STATUSES,
  VIDEO_TYPES,
  type VideoRow,
} from "@/lib/admin/videos";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/videos/")({
  component: VideosAdminPage,
});

type SortKey = "newest" | "oldest" | "title" | "published" | "updated";
const PAGE_SIZE = 12;

function VideosAdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(adminVideoListQueryOptions);
  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alle");
  const [type, setType] = useState("alle");
  const [source, setSource] = useState("alle");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirm, setConfirm] = useState<VideoRow | null>(null);

  const releaseById = useMemo(
    () => new Map((releases.data ?? []).map((r) => [r.id, r] as const)),
    [releases.data],
  );
  const songById = useMemo(() => new Map((songs.data ?? []).map((s) => [s.id, s] as const)), [songs.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "videos"] });
    void qc.invalidateQueries({ queryKey: ["site-content"] });
  };

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen"),
  });

  const rows = useMemo(() => {
    let list = data ?? [];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((v) => {
        const rel = v.release_id ? releaseById.get(v.release_id)?.title ?? "" : "";
        const sng = v.song_id ? songById.get(v.song_id)?.title ?? v.song : v.song;
        return [v.title, v.slug ?? "", v.description ?? "", rel, sng ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
    }
    if (status !== "alle") list = list.filter((v) => v.status === status);
    if (type !== "alle") list = list.filter((v) => v.category === type);
    if (source !== "alle") list = list.filter((v) => (v.source ?? "upload") === source);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "oldest") return a.video_date.localeCompare(b.video_date);
      if (sort === "updated") return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      if (sort === "published")
        return (b.publish_at ?? `${b.video_date}T00:00:00Z`).localeCompare(
          a.publish_at ?? `${a.video_date}T00:00:00Z`,
        );
      return b.video_date.localeCompare(a.video_date);
    });
    return sorted;
  }, [data, q, status, type, source, sort, releaseById, songById]);

  const duplicate = (v: VideoRow) => async () => {
    const id = newVideoId();
    const slug = await uniqueVideoSlug(`${v.title} kopie`);
    const { created_at: _c, updated_at: _u, ...rest } = v;
    // Nur der Datensatz wird kopiert — die Mediendatei bleibt dieselbe Referenz.
    await saveVideo({ ...rest, id, slug, title: `${v.title} (Kopie)`, status: "Entwurf", publish_at: null }, "insert");
    toast.success("Video als Entwurf dupliziert — die Mediendatei wurde nicht kopiert.");
    void navigate({ to: "/admin/videos/$id/edit", params: { id } });
  };

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Videos"
        description="Zentrales Video-CMS: Quelle, Thumbnail, Zuordnungen, Veröffentlichung und SEO."
        action={
          <Link
            to="/admin/videos/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" /> Neues Video
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="glass flex min-w-0 items-center gap-2 rounded-xl px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Videos suchen…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none">
          <option value="alle">Alle Status</option>
          {VIDEO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none">
          <option value="alle">Alle Typen</option>
          {VIDEO_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none">
          <option value="alle">Alle Quellen</option>
          {VIDEO_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none">
          <option value="newest">Neueste</option>
          <option value="oldest">Älteste</option>
          <option value="title">Titel A–Z</option>
          <option value="published">Veröffentlichungsdatum</option>
          <option value="updated">Zuletzt bearbeitet</option>
        </select>
      </div>

      {isLoading && <AdminSkeleton rows={5} />}
      {error && <AdminError message="Videos konnten nicht geladen werden." onRetry={() => void refetch()} />}

      {!isLoading && !error && rows.length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {(data ?? []).length === 0 ? "Noch keine Videos angelegt." : "Keine Videos passen zu den Filtern."}
          </p>
          <Link
            to="/admin/videos/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Neues Video
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-3">
          {rows.slice(0, visible).map((v) => {
            const availability = videoAvailability(v);
            const rel = v.release_id ? releaseById.get(v.release_id) : undefined;
            const sng = v.song_id ? songById.get(v.song_id) : undefined;
            return (
              <div key={v.id} className="glass min-w-0 rounded-2xl p-4">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                    {v.thumb_url ? (
                      <img src={v.thumb_url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center bg-muted">
                        <VideoIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold uppercase">{v.title}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          availability === "Öffentlich" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {availability}
                      </span>
                      {!v.video_url && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                          keine Quelle
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {v.category} · {sourceLabel(v.source)} · {formatDate(v.video_date)}
                      {rel ? ` · ${rel.title}` : ""}
                      {sng ? ` · ${sng.title}` : ""}
                      {v.updated_at ? ` · bearbeitet ${new Date(v.updated_at).toLocaleDateString("de-DE")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/videos/$id/preview"
                      params={{ id: v.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Eye className="size-3.5" /> Vorschau
                    </Link>
                    <Link
                      to="/admin/videos/$id/edit"
                      params={{ id: v.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Pencil className="size-3.5" /> Bearbeiten
                    </Link>
                    <button
                      onClick={() => mutate.mutate(duplicate(v))}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Copy className="size-3.5" /> Duplizieren
                    </button>
                    {v.status === "Veröffentlicht" ? (
                      <button
                        onClick={() => mutate.mutate(() => setVideoStatus(v.id, "Offline"))}
                        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                      >
                        Offline nehmen
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!v.video_url) {
                            toast.error("Ohne Videoquelle kann nicht veröffentlicht werden.");
                            return;
                          }
                          mutate.mutate(() => setVideoStatus(v.id, "Veröffentlicht"));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        <Upload className="size-3.5" /> Veröffentlichen
                      </button>
                    )}
                    {v.status !== "Archiviert" && (
                      <button
                        onClick={() => setConfirm(v)}
                        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                      >
                        <Archive className="size-3.5" /> Archivieren
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length > visible && (
            <button
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className="glass mx-auto mt-2 rounded-full px-5 py-2.5 text-sm hover:text-primary"
            >
              Mehr laden ({rows.length - visible})
            </button>
          )}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold uppercase">Video archivieren</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              „{confirm.title}" wird öffentlich ausgeblendet. Der Datensatz, das Thumbnail, die Videoquelle und
              alle Zuordnungen bleiben vollständig erhalten.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="glass rounded-full px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                onClick={() => mutate.mutate(() => setVideoStatus(confirm.id, "Archiviert"))}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Archivieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
