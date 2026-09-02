import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileAudio, FileVideo, ImageIcon, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  adminMediaQueryOptions,
  adminVideosQueryOptions,
  buildUsageIndex,
  deleteMedia,
  folderForKind,
  formatBytes,
  kindFromMime,
  MEDIA_ACCEPT_ALL,
  uploadMedia,
  type MediaAsset,
  type MediaKind,
} from "@/lib/admin/media";
import { adminReleasesQueryOptions } from "@/lib/admin/releases";
import { adminSongListQueryOptions } from "@/lib/admin/songs";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: MediaLibraryPage,
});

type KindFilter = "alle" | MediaKind;
type UsageFilter = "alle" | "used" | "unused";
type SortKey = "newest" | "oldest" | "name" | "size" | "type";

const PAGE_SIZE = 24;

function MediaLibraryPage() {
  const qc = useQueryClient();
  const media = useQuery(adminMediaQueryOptions);
  const [releases, songs, videos] = useQueries({
    queries: [adminReleasesQueryOptions, adminSongListQueryOptions, adminVideosQueryOptions],
  });

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("alle");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("alle");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lastFailed, setLastFailed] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usage = useMemo(
    () => buildUsageIndex(releases.data ?? [], songs.data ?? [], videos.data ?? []),
    [releases.data, songs.data, videos.data],
  );

  const stats = useMemo(() => {
    const list = media.data ?? [];
    const by = (k: MediaKind) => list.filter((a) => a.kind === k).length;
    return {
      total: list.length,
      image: by("image"),
      audio: by("audio"),
      video: by("video"),
      other: by("other"),
      size: list.reduce((sum, a) => sum + (a.size ?? 0), 0),
    };
  }, [media.data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = media.data ?? [];
    if (kind !== "alle") list = list.filter((a) => a.kind === kind);
    if (usageFilter !== "alle") {
      list = list.filter((a) => (usage.get(a.path)?.length ? usageFilter === "used" : usageFilter === "unused"));
    }
    if (term) {
      list = list.filter(
        (a) =>
          a.displayName.toLowerCase().includes(term) ||
          a.kind.includes(term) ||
          (a.mimeType ?? "").toLowerCase().includes(term) ||
          (usage.get(a.path) ?? []).some((u) => u.label.toLowerCase().includes(term)),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "name") return a.displayName.localeCompare(b.displayName);
      if (sort === "size") return (b.size ?? 0) - (a.size ?? 0);
      if (sort === "type") return a.kind.localeCompare(b.kind);
      if (sort === "oldest") return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return sorted;
  }, [media.data, q, kind, usageFilter, sort, usage]);

  async function upload(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setLastFailed(null);
    try {
      const k = kindFromMime(file.type, file.name);
      if (k === "other") {
        toast.error("Dieser Dateityp wird von der bestehenden Medienarchitektur nicht unterstützt.");
        return;
      }
      await uploadMedia(file, folderForKind(k));
      await qc.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success(`${file.name} hochgeladen`);
    } catch (e) {
      setLastFailed(file);
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  const removeAsset = useMutation({
    mutationFn: async (asset: MediaAsset) => deleteMedia(asset.path),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "media"] });
      setConfirmDelete(null);
      setSelected(null);
      toast.success("Datei gelöscht");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen"),
  });

  const loading = media.isLoading || releases.isLoading || songs.isLoading || videos.isLoading;

  return (
    <div
      className="min-w-0"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files?.[0]);
      }}
    >
      <AdminPageHeader
        title="Media Library"
        description="Zentrale Verwaltung aller Artworks, Audio- und Videodateien im geschützten Speicher."
        action={
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="size-4" /> {uploading ? "Lädt hoch…" : "Medien hochladen"}
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT_ALL}
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {lastFailed && (
        <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Upload von „{lastFailed.name}" fehlgeschlagen.</p>
          <button
            onClick={() => void upload(lastFailed)}
            className="glass rounded-full px-4 py-2 text-xs hover:text-primary"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Assets", String(stats.total)],
          ["Bilder", String(stats.image)],
          ["Audio", String(stats.audio)],
          ["Video", String(stats.video)],
          ["Sonstige", String(stats.other)],
          ["Speicher", formatBytes(stats.size)],
        ].map(([label, value]) => (
          <div key={label} className="glass min-w-0 rounded-xl px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass flex min-w-0 items-center gap-2 rounded-xl px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Dateien, Typ oder Verwendung suchen…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as KindFilter)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Typen</option>
          <option value="image">Bilder</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="other">Sonstige</option>
        </select>
        <select
          value={usageFilter}
          onChange={(e) => setUsageFilter(e.target.value as UsageFilter)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="alle">Alle Assets</option>
          <option value="used">In Verwendung</option>
          <option value="unused">Nicht verwendet</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="glass min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="newest">Neueste zuerst</option>
          <option value="oldest">Älteste zuerst</option>
          <option value="name">Name A–Z</option>
          <option value="size">Größe</option>
          <option value="type">Typ</option>
        </select>
      </div>

      {dragging && (
        <div className="glass mb-5 rounded-xl border border-dashed border-primary/50 p-6 text-center text-sm">
          Datei hier ablegen, um sie hochzuladen
        </div>
      )}

      {loading && <AdminSkeleton rows={5} />}
      {media.error && (
        <AdminError message="Medien konnten nicht geladen werden." onRetry={() => void media.refetch()} />
      )}

      {!loading && !media.error && filtered.length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {(media.data ?? []).length === 0
              ? "Noch keine Medien hochgeladen."
              : "Keine Dateien passen zu den Filtern."}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.slice(0, visible).map((a) => {
              const used = usage.get(a.path) ?? [];
              return (
                <button
                  key={a.path}
                  onClick={() => setSelected(a)}
                  className="glass min-w-0 overflow-hidden rounded-2xl text-left transition-transform hover:scale-[1.02]"
                >
                  <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted/40">
                    {a.kind === "image" ? (
                      <img src={a.url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : a.kind === "audio" ? (
                      <FileAudio className="size-7 text-muted-foreground" />
                    ) : a.kind === "video" ? (
                      <FileVideo className="size-7 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="size-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">{a.displayName}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {a.kind} · {formatBytes(a.size)}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                        used.length ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {used.length ? `${used.length}× verwendet` : "Nicht verwendet"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {visible < filtered.length && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="glass rounded-full px-6 py-2.5 text-sm hover:text-primary"
              >
                Mehr laden ({filtered.length - visible})
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <MediaInspector
          asset={selected}
          usage={usage.get(selected.path) ?? []}
          onClose={() => setSelected(null)}
          onDelete={() => setConfirmDelete(selected)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/85 p-4">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold uppercase">Datei löschen</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              „{confirmDelete.displayName}" wird endgültig aus dem Speicher entfernt. Releases, Songs, Videos
              und Bestellungen bleiben unverändert.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="glass rounded-full px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                onClick={() => removeAsset.mutate(confirmDelete)}
                disabled={removeAsset.isPending}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaInspector({
  asset,
  usage,
  onClose,
  onDelete,
}: {
  asset: MediaAsset;
  usage: { label: string; field: string }[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const inUse = usage.length > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-3 sm:p-6">
      <div className="glass-strong flex max-h-[88dvh] w-full max-w-2xl min-w-0 flex-col overflow-y-auto rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold uppercase">{asset.displayName}</h2>
          <button onClick={onClose} aria-label="Schließen" className="glass rounded-full p-2">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-muted/30">
          {asset.kind === "image" && (
            <img
              src={asset.url}
              alt=""
              className="max-h-[45dvh] w-full object-contain"
              onLoad={(e) =>
                setDimensions(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)
              }
            />
          )}
          {asset.kind === "audio" && (
            <audio
              controls
              preload="metadata"
              src={asset.url}
              className="w-full p-4"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d)) setDuration(`${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}`);
              }}
            />
          )}
          {asset.kind === "video" && (
            <video
              controls
              preload="metadata"
              src={asset.url}
              className="max-h-[45dvh] w-full"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (Number.isFinite(v.duration))
                  setDuration(`${Math.floor(v.duration / 60)}:${String(Math.round(v.duration % 60)).padStart(2, "0")}`);
                if (v.videoWidth) setDimensions(`${v.videoWidth} × ${v.videoHeight} px`);
              }}
            />
          )}
        </div>

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Typ" value={asset.mimeType ?? asset.kind} />
          <Info label="Größe" value={formatBytes(asset.size)} />
          {dimensions && <Info label="Abmessungen" value={dimensions} />}
          {duration && <Info label="Länge" value={duration} />}
          <Info
            label="Hochgeladen"
            value={asset.createdAt ? new Date(asset.createdAt).toLocaleString("de-DE") : "—"}
          />
          <Info label="Ablage" value={`media/${asset.folder} (privat)`} />
        </dl>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Verwendung</p>
          {inUse ? (
            <ul className="mt-3 grid gap-2">
              {usage.map((u, i) => (
                <li key={i} className="glass rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{u.field}: </span>
                  {u.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Aktuell nicht verwendet.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="glass rounded-full px-4 py-2 text-sm hover:text-primary"
          >
            In neuem Tab öffnen
          </a>
          {inUse ? (
            <span className="glass rounded-full px-4 py-2 text-sm text-muted-foreground">
              Asset in Verwendung — Löschen gesperrt
            </span>
          ) : (
            <button
              onClick={onDelete}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm hover:text-primary"
            >
              <Trash2 className="size-4" /> Löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass min-w-0 rounded-xl px-4 py-2.5">
      <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate">{value}</dd>
    </div>
  );
}
