import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileAudio, FileVideo, ImageIcon, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminMediaQueryOptions,
  folderForKind,
  formatBytes,
  MEDIA_ACCEPT,
  uploadMedia,
  type MediaAsset,
  type MediaKind,
} from "@/lib/admin/media";

type Props = {
  kind: Exclude<MediaKind, "other">;
  title: string;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
};

/**
 * Auswahl bestehender Assets aus der Medienbibliothek.
 * Es wird immer die vorhandene Datei referenziert – nie dupliziert.
 */
export function MediaPicker({ kind, title, onSelect, onClose }: Props) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminMediaQueryOptions);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const assets = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((a) => a.kind === kind)
      .filter((a) => !term || a.displayName.toLowerCase().includes(term));
  }, [data, kind, q]);

  async function handleUpload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const { url, path } = await uploadMedia(file, folderForKind(kind));
      await qc.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success("Datei hochgeladen");
      onSelect({
        path,
        folder: folderForKind(kind),
        fileName: path.split("/").pop() ?? file.name,
        displayName: file.name,
        url,
        kind,
        mimeType: file.type || null,
        size: file.size,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const Icon = kind === "image" ? ImageIcon : kind === "audio" ? FileAudio : FileVideo;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-3 sm:p-6">
      <div className="glass-strong flex max-h-[85dvh] w-full max-w-3xl min-w-0 flex-col rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold uppercase">{title}</h2>
          <button onClick={onClose} aria-label="Schließen" className="glass rounded-full p-2">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="glass flex min-w-0 flex-1 items-center gap-2 rounded-xl px-4 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Dateien suchen…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_ACCEPT[kind]}
            className="hidden"
            onChange={(e) => {
              void handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="size-4" /> {busy ? "Lädt…" : "Neu hochladen"}
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Lädt…</p>}
          {error && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Medien konnten nicht geladen werden.</p>
              <button onClick={() => void refetch()} className="glass mt-3 rounded-full px-4 py-2 text-sm">
                Erneut versuchen
              </button>
            </div>
          )}
          {!isLoading && !error && assets.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Keine passenden Dateien in der Medienbibliothek.
            </p>
          )}
          {kind === "image" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {assets.map((a) => (
                <button
                  key={a.path}
                  onClick={() => onSelect(a)}
                  className="glass min-w-0 overflow-hidden rounded-xl text-left transition-transform hover:scale-[1.02]"
                >
                  <img src={a.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  <div className="p-2">
                    <p className="truncate text-xs">{a.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(a.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {assets.map((a) => (
                <div key={a.path} className="glass flex min-w-0 items-center gap-3 rounded-xl p-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(a.size)}</p>
                    {kind === "audio" && (
                      <audio controls preload="none" src={a.url} className="mt-2 w-full max-w-xs" />
                    )}
                  </div>
                  <button
                    onClick={() => onSelect(a)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Auswählen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
