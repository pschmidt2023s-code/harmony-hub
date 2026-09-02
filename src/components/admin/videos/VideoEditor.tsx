import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ImageIcon, Save, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { adminReleasesQueryOptions, adminSongsQueryOptions, slugifyTitle } from "@/lib/admin/releases";
import {
  isVideoPublic,
  newVideoId,
  saveVideo,
  uniqueVideoSlug,
  validateSource,
  videoFileName,
  VIDEO_SOURCES,
  VIDEO_STATUSES,
  VIDEO_TYPES,
  type VideoRow,
  type VideoStatus,
} from "@/lib/admin/videos";
import { VideoPlayer } from "@/components/video/VideoPlayer";

const TABS = ["Übersicht", "Videoquelle", "Thumbnail", "Zuordnung", "Publishing", "SEO"] as const;
type Tab = (typeof TABS)[number];

export type VideoDraft = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  source: string;
  video_url: string;
  thumb_url: string;
  release_id: string;
  song_id: string;
  status: VideoStatus;
  video_date: string;
  publish_at: string;
  seo_title: string;
  seo_description: string;
  song: string;
  views: string;
  sort_order: number;
  thumb_key: string;
};

export function emptyVideoDraft(): VideoDraft {
  return {
    id: newVideoId(),
    title: "",
    slug: "",
    description: "",
    category: "Musikvideo",
    source: "youtube",
    video_url: "",
    thumb_url: "",
    release_id: "",
    song_id: "",
    status: "Entwurf",
    video_date: new Date().toISOString().slice(0, 10),
    publish_at: "",
    seo_title: "",
    seo_description: "",
    song: "",
    views: "0",
    sort_order: 0,
    thumb_key: "midnight",
  };
}

export function rowToDraft(v: VideoRow): VideoDraft {
  return {
    id: v.id,
    title: v.title,
    slug: v.slug ?? "",
    description: v.description ?? "",
    category: v.category,
    source: v.source ?? "upload",
    video_url: v.video_url ?? "",
    thumb_url: v.thumb_url ?? "",
    release_id: v.release_id ?? "",
    song_id: v.song_id ?? "",
    status: (VIDEO_STATUSES as readonly string[]).includes(v.status)
      ? (v.status as VideoStatus)
      : "Entwurf",
    video_date: v.video_date,
    publish_at: v.publish_at ? v.publish_at.slice(0, 16) : "",
    seo_title: v.seo_title ?? "",
    seo_description: v.seo_description ?? "",
    song: v.song ?? "",
    views: v.views ?? "0",
    sort_order: v.sort_order ?? 0,
    thumb_key: v.thumb_key,
  };
}

export function VideoEditor({ mode, initial }: { mode: "insert" | "update"; initial: VideoDraft }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Übersicht");
  const [draft, setDraft] = useState<VideoDraft>(initial);
  const [picker, setPicker] = useState<null | "video" | "thumb">(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const savedRef = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(draft) !== savedRef.current;
  const publishedSlug = mode === "update" && initial.status === "Veröffentlicht" ? initial.slug : null;

  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);

  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?") });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof VideoDraft>(key: K, value: VideoDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const sourceError = useMemo(
    () => validateSource(draft.source, draft.video_url),
    [draft.source, draft.video_url],
  );

  const selectedSong = songs.data?.find((s) => s.id === draft.song_id);
  const selectedRelease = releases.data?.find((r) => r.id === draft.release_id);

  const save = useMutation({
    mutationFn: async (status?: VideoStatus) => {
      if (!draft.title.trim()) throw new Error("Bitte einen Titel angeben.");
      const nextStatus = status ?? draft.status;
      const slug =
        draft.slug.trim() ? slugifyTitle(draft.slug) : await uniqueVideoSlug(draft.title, draft.id);
      const values = {
        id: draft.id,
        title: draft.title.trim(),
        slug,
        description: draft.description,
        category: draft.category,
        source: draft.source,
        video_url: draft.video_url.trim() || null,
        thumb_url: draft.thumb_url.trim() || null,
        thumb_key: draft.thumb_key,
        release_id: draft.release_id || null,
        song_id: draft.song_id || null,
        song: selectedSong?.title ?? draft.song,
        status: nextStatus,
        video_date: draft.video_date,
        publish_at: draft.publish_at ? new Date(draft.publish_at).toISOString() : null,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        views: draft.views,
        sort_order: draft.sort_order,
      };
      await saveVideo(values, mode);
      return { slug, status: nextStatus };
    },
    onSuccess: ({ slug, status }) => {
      const next = { ...draft, slug, status };
      savedRef.current = JSON.stringify(next);
      setDraft(next);
      setConfirmPublish(false);
      void qc.invalidateQueries({ queryKey: ["admin", "videos"] });
      void qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(mode === "insert" ? "Video angelegt" : "Video gespeichert");
      if (mode === "insert") void navigate({ to: "/admin/videos/$id/edit", params: { id: draft.id } });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen"),
  });

  const field = "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none";
  const label = "text-xs uppercase tracking-[0.2em] text-muted-foreground";

  return (
    <div className="min-w-0 pb-28">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/videos" className="text-sm text-muted-foreground hover:text-primary">
          ← Videos
        </Link>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {draft.status}
        </span>
      </div>

      <div className="mb-6 flex min-w-0 gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Übersicht" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div>
            <label className={label}>Titel</label>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className={`${field} mt-2`}
              placeholder="Videotitel"
            />
          </div>
          <div>
            <label className={label}>Slug</label>
            <input
              value={draft.slug}
              onChange={(e) => set("slug", e.target.value)}
              onBlur={(e) => set("slug", slugifyTitle(e.target.value))}
              className={`${field} mt-2`}
              placeholder="wird aus dem Titel erzeugt"
            />
            {publishedSlug && draft.slug !== publishedSlug && (
              <p className="mt-2 flex items-start gap-2 text-xs text-primary">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Achtung: Dieses Video ist veröffentlicht. Ein neuer Slug ändert die öffentliche URL —
                bestehende Links (/videos/{publishedSlug}) funktionieren danach nicht mehr.
              </p>
            )}
          </div>
          <div>
            <label className={label}>Beschreibung</label>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              className={`${field} mt-2 resize-y`}
            />
          </div>
          <div>
            <label className={label}>Videotyp</label>
            <select
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
              className={`${field} mt-2`}
            >
              {VIDEO_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === "Videoquelle" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div>
            <label className={label}>Quelle</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {VIDEO_SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => set("source", s.id)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    draft.source === s.id
                      ? "bg-primary text-primary-foreground"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {draft.source === "upload" ? (
            <div>
              <label className={label}>Videodatei aus der Mediathek</label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => setPicker("video")} className="glass rounded-full px-4 py-2 text-sm hover:text-primary">
                  Aus Mediathek wählen
                </button>
                {draft.video_url && (
                  <button
                    onClick={() => set("video_url", "")}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {videoFileName(draft.video_url) ?? "Keine Datei gewählt"}
              </p>
            </div>
          ) : (
            <div>
              <label className={label}>
                {draft.source === "youtube" ? "YouTube-URL" : draft.source === "vimeo" ? "Vimeo-URL" : "Externe URL"}
              </label>
              <input
                value={draft.video_url}
                onChange={(e) => set("video_url", e.target.value)}
                className={`${field} mt-2`}
                placeholder="https://…"
              />
            </div>
          )}

          {sourceError ? (
            <p className="text-xs text-primary">{sourceError}</p>
          ) : (
            <div className="max-w-2xl">
              <VideoPlayer source={draft.source} url={draft.video_url} poster={draft.thumb_url} title={draft.title} />
            </div>
          )}
        </div>
      )}

      {tab === "Thumbnail" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div className="glass grid aspect-video w-full max-w-md place-items-center overflow-hidden rounded-2xl">
            {draft.thumb_url ? (
              <img src={draft.thumb_url} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setPicker("thumb")} className="glass rounded-full px-4 py-2 text-sm hover:text-primary">
              Aus Mediathek wählen
            </button>
            {draft.thumb_url && (
              <button onClick={() => set("thumb_url", "")} className="text-xs text-muted-foreground hover:text-primary">
                Entfernen
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {videoFileName(draft.thumb_url) ?? "Ohne Thumbnail wird eine neutrale Fallback-Darstellung genutzt."}
          </p>
        </div>
      )}

      {tab === "Zuordnung" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div>
            <label className={label}>Release</label>
            <select
              value={draft.release_id}
              onChange={(e) => set("release_id", e.target.value)}
              className={`${field} mt-2`}
            >
              <option value="">Kein Release</option>
              {(releases.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {r.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Song</label>
            <select value={draft.song_id} onChange={(e) => set("song_id", e.target.value)} className={`${field} mt-2`}>
              <option value="">Kein Song</option>
              {(songs.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Es werden ausschließlich vorhandene Releases und Songs verknüpft — im Video-CMS entstehen keine
            neuen Release- oder Song-Datensätze.
          </p>
        </div>
      )}

      {tab === "Publishing" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div>
            <label className={label}>Status</label>
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as VideoStatus)}
              className={`${field} mt-2`}
            >
              {VIDEO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Veröffentlichungsdatum</label>
              <input
                type="date"
                value={draft.video_date}
                onChange={(e) => set("video_date", e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
            <div>
              <label className={label}>Geplant für (optional)</label>
              <input
                type="datetime-local"
                value={draft.publish_at}
                onChange={(e) => set("publish_at", e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Geplante Videos erscheinen erst, wenn der Zeitpunkt erreicht ist. „Offline" nimmt ein Video aus der
            öffentlichen Auslieferung, ohne den Datensatz zu löschen.
          </p>
          <div>
            <button
              onClick={() => setConfirmPublish(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Veröffentlichen…
            </button>
          </div>
        </div>
      )}

      {tab === "SEO" && (
        <div className="glass grid gap-5 rounded-2xl p-5 md:p-6">
          <div>
            <label className={label}>SEO-Titel</label>
            <input
              value={draft.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
              className={`${field} mt-2`}
              placeholder={draft.title || "Videotitel"}
            />
          </div>
          <div>
            <label className={label}>SEO-Beschreibung</label>
            <textarea
              value={draft.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
              rows={3}
              className={`${field} mt-2 resize-y`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            OG-Bild ist das Thumbnail. Canonical URL: /videos/{draft.slug || "…"}
          </p>
        </div>
      )}

      <div className="glass-strong fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 md:px-8">
        <p className="text-xs text-muted-foreground">
          {dirty ? "Ungespeicherte Änderungen" : "Alle Änderungen gespeichert"}
        </p>
        <div className="flex items-center gap-3">
          {mode === "update" && (
            <Link
              to="/admin/videos/$id/preview"
              params={{ id: draft.id }}
              className="glass rounded-full px-4 py-2 text-sm hover:text-primary"
            >
              Vorschau
            </Link>
          )}
          <button
            onClick={() => save.mutate(undefined)}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="size-4" /> {save.isPending ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>

      {confirmPublish && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="glass-strong w-full max-w-lg rounded-2xl p-6">
            <h2 className="text-lg font-semibold uppercase">Video veröffentlichen</h2>
            <div className="mt-4 flex gap-4">
              <div className="glass grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-xl">
                {draft.thumb_url ? (
                  <img src={draft.thumb_url} alt="" className="size-full object-cover" />
                ) : (
                  <VideoIcon className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{draft.title || "Ohne Titel"}</p>
                <p className="mt-1 text-muted-foreground">{draft.category}</p>
                <p className="text-muted-foreground">
                  {draft.publish_at ? new Date(draft.publish_at).toLocaleString("de-DE") : draft.video_date}
                </p>
                <p className="text-muted-foreground">
                  {selectedRelease ? selectedRelease.title : "Kein Release"}
                  {selectedSong ? ` · ${selectedSong.title}` : ""}
                </p>
              </div>
            </div>
            <ul className="mt-4 grid gap-1 text-xs text-primary">
              {sourceError && <li>• {sourceError}</li>}
              {!draft.thumb_url && <li>• Kein Thumbnail hinterlegt (optional).</li>}
              {!draft.description.trim() && <li>• Keine Beschreibung hinterlegt (optional).</li>}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmPublish(false)} className="glass rounded-full px-4 py-2 text-sm">
                Abbrechen
              </button>
              <button
                onClick={() => save.mutate("Veröffentlicht")}
                disabled={save.isPending}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Jetzt veröffentlichen
              </button>
            </div>
            {draft.publish_at && !isVideoPublic({ status: "Veröffentlicht", publish_at: new Date(draft.publish_at).toISOString(), video_date: draft.video_date }) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Hinweis: Durch den geplanten Zeitpunkt wird das Video erst später öffentlich sichtbar.
              </p>
            )}
          </div>
        </div>
      )}

      {picker && (
        <MediaPicker
          kind={picker === "video" ? "video" : "image"}
          title={picker === "video" ? "Videodatei wählen" : "Thumbnail wählen"}
          onClose={() => setPicker(null)}
          onSelect={(asset) => {
            if (picker === "video") set("video_url", asset.url);
            else set("thumb_url", asset.url);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
