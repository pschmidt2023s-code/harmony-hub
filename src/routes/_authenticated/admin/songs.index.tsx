import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Eye, Music2, Pause, Pencil, Play, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  adminSongListQueryOptions,
  newSongId,
  saveSong,
  setSongStatus,
  songAvailability,
  SONG_STATUSES,
  uniqueSongSlug,
  type SongRow,
} from "@/lib/admin/songs";
import { adminReleasesQueryOptions, isReleasePublic } from "@/lib/admin/releases";
import { toPlayerSong } from "@/components/admin/songs/SongEditor";
import { usePlayer } from "@/components/player/player-context";
import { formatTime } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/songs/")({
  component: SongsPage,
});

type SortKey = "order" | "title" | "updated" | "duration";

function SongsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const player = usePlayer();
  const { data, isLoading, error, refetch } = useQuery(adminSongListQueryOptions);
  const releases = useQuery(adminReleasesQueryOptions);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alle");
  const [releaseFilter, setReleaseFilter] = useState("alle");
  const [sort, setSort] = useState<SortKey>("order");
  const [confirm, setConfirm] = useState<SongRow | null>(null);

  const releaseById = useMemo(
    () => new Map((releases.data ?? []).map((r) => [r.id, r] as const)),
    [releases.data],
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "songs"] });
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
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          (s.slug ?? "").toLowerCase().includes(term) ||
          (s.album ?? "").toLowerCase().includes(term),
      );
    }
    if (status !== "alle") list = list.filter((s) => s.status === status);
    if (releaseFilter === "standalone") list = list.filter((s) => !s.release_id);
    else if (releaseFilter !== "alle") list = list.filter((s) => s.release_id === releaseFilter);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "updated") return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      if (sort === "duration") return (b.duration ?? 0) - (a.duration ?? 0);
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    return sorted;
  }, [data, q, status, releaseFilter, sort]);

  const duplicate = (s: SongRow) => async () => {
    const id = newSongId();
    const slug = await uniqueSongSlug(`${s.title} kopie`);
    const { created_at: _c, updated_at: _u, ...rest } = s;
    await saveSong({ ...rest, id, slug, title: `${s.title} (Kopie)`, status: "Entwurf" }, "insert");
    toast.success("Song dupliziert");
    void navigate({ to: "/admin/songs/$id/edit", params: { id } });
  };

  const preview = (s: SongRow) => {
    if (!s.audio_url) {
      toast.error("Kein Audio hinterlegt.");
      return;
    }
    if (player.current?.id === s.id && player.playing) {
      player.toggle();
      return;
    }
    const rel = s.release_id ? releaseById.get(s.release_id) : undefined;
    const song = toPlayerSong(s, rel?.cover_url ?? undefined);
    player.play(song, [song]);
  };

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Songs"
        description="Zentrale Song-Bibliothek: Audio, Metadaten, Lyrics, Credits und Release-Zuordnung."
        action={
          <Link
            to="/admin/songs/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" /> Neuer Song
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass flex min-w-0 items-center gap-2 rounded-xl px-4 py-2.5 lg:col-span-1">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Songs suchen…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={releaseFilter}
          onChange={(e) => setReleaseFilter(e.target.value)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Releases</option>
          <option value="standalone">Ohne Release</option>
          {(releases.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Status</option>
          {SONG_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="order">Tracknummer</option>
          <option value="title">Titel A–Z</option>
          <option value="updated">Zuletzt bearbeitet</option>
          <option value="duration">Länge</option>
        </select>
      </div>

      {isLoading && <AdminSkeleton rows={5} />}
      {error && <AdminError message="Songs konnten nicht geladen werden." onRetry={() => void refetch()} />}

      {!isLoading && !error && rows.length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {(data ?? []).length === 0 ? "Noch keine Songs angelegt." : "Keine Songs passen zu den Filtern."}
          </p>
          <Link
            to="/admin/songs/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Neuer Song
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((s) => {
            const rel = s.release_id ? releaseById.get(s.release_id) : undefined;
            const availability = songAvailability(s, rel ? isReleasePublic(rel) : null);
            const isPlaying = player.current?.id === s.id && player.playing;
            return (
              <div key={s.id} className="glass min-w-0 rounded-2xl p-4">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                    {s.cover_url || rel?.cover_url ? (
                      <img
                        src={s.cover_url || rel?.cover_url || ""}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-muted">
                        <Music2 className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold uppercase">{s.title}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          availability === "Öffentlich"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {availability}
                      </span>
                      {!s.audio_url && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                          kein Audio
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {s.duration ? formatTime(s.duration) : "—"} · {rel ? rel.title : "Kein Release"}
                      {s.updated_at ? ` · aktualisiert ${new Date(s.updated_at).toLocaleDateString("de-DE")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => preview(s)}
                      disabled={!s.audio_url}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary disabled:opacity-40"
                    >
                      {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} Preview
                    </button>
                    <Link
                      to="/admin/songs/$id/preview"
                      params={{ id: s.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Eye className="size-3.5" /> Öffnen
                    </Link>
                    <Link
                      to="/admin/songs/$id/edit"
                      params={{ id: s.id }}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Pencil className="size-3.5" /> Bearbeiten
                    </Link>
                    <button
                      onClick={() => mutate.mutate(duplicate(s))}
                      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                    >
                      <Copy className="size-3.5" /> Duplizieren
                    </button>
                    {s.status === "Veröffentlicht" ? (
                      <button
                        onClick={() => mutate.mutate(() => setSongStatus(s.id, "Entwurf"))}
                        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors hover:text-primary"
                      >
                        Offline nehmen
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!s.audio_url) {
                            toast.error("Ohne Audio kann der Song nicht veröffentlicht werden.");
                            return;
                          }
                          mutate.mutate(() => setSongStatus(s.id, "Veröffentlicht"));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        <Upload className="size-3.5" /> Veröffentlichen
                      </button>
                    )}
                    {s.status !== "Archiviert" && (
                      <button
                        onClick={() => setConfirm(s)}
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
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold uppercase">Song archivieren</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              „{confirm.title}" wird öffentlich ausgeblendet. Audio, Lyrics, Credits, Artwork und die
              Release-Zuordnung bleiben vollständig erhalten.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="glass rounded-full px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                onClick={() => mutate.mutate(() => setSongStatus(confirm.id, "Archiviert"))}
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
