import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { slugifyTitle } from "./releases";

export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
export type VideoInsert = Database["public"]["Tables"]["videos"]["Insert"];

/** Sicherer Lebenszyklus — es gibt bewusst kein permanentes Löschen im Video-CMS. */
export const VIDEO_STATUSES = ["Entwurf", "Geplant", "Veröffentlicht", "Offline", "Archiviert"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

/** Bestehende Kategorien der Datenbank — es werden keine neuen Typen erfunden. */
export const VIDEO_TYPES = [
  "Musikvideo",
  "Visualizer",
  "Lyric Video",
  "Live",
  "Behind the Scenes",
  "Short",
] as const;

export const VIDEO_SOURCES = [
  { id: "upload", label: "Hochgeladenes Video" },
  { id: "youtube", label: "YouTube" },
  { id: "vimeo", label: "Vimeo" },
  { id: "external", label: "Externe URL" },
] as const;
export type VideoSource = (typeof VIDEO_SOURCES)[number]["id"];

export const sourceLabel = (id: string) => VIDEO_SOURCES.find((s) => s.id === id)?.label ?? "Extern";

export const adminVideoListQueryOptions = queryOptions({
  queryKey: ["admin", "videos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("video_date", { ascending: false });
    if (error) throw error;
    return data as VideoRow[];
  },
});

export function newVideoId() {
  return `vid_${crypto.randomUUID().slice(0, 8)}`;
}

export async function uniqueVideoSlug(base: string, ignoreId?: string) {
  const root = slugifyTitle(base) || "video";
  const { data, error } = await supabase.from("videos").select("id, slug");
  if (error) throw error;
  const taken = new Set((data ?? []).filter((v) => v.id !== ignoreId).map((v) => v.slug ?? ""));
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

export async function saveVideo(values: VideoInsert, mode: "insert" | "update") {
  const q =
    mode === "insert"
      ? supabase.from("videos").insert(values)
      : supabase.from("videos").update(values).eq("id", values.id!);
  const { error } = await q;
  if (error) throw error;
}

/** Nur Statuswechsel — Quelle, Thumbnail und Zuordnungen bleiben unverändert erhalten. */
export async function setVideoStatus(id: string, status: VideoStatus) {
  const { error } = await supabase.from("videos").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ---------- Sichtbarkeit ---------- */

/**
 * Öffentliche Sichtbarkeit (Admin-Vorschau; öffentlich entscheidet immer der Server).
 * Geplante Videos werden erst ab ihrem Veröffentlichungszeitpunkt sichtbar.
 */
export function isVideoPublic(
  v: Pick<VideoRow, "status" | "publish_at" | "video_date">,
  now: number = Date.now(),
) {
  if (v.status === "Veröffentlicht") {
    if (v.publish_at) return Date.parse(v.publish_at) <= now;
    return Date.parse(`${v.video_date}T00:00:00Z`) <= now;
  }
  if (v.status === "Geplant" && v.publish_at) return Date.parse(v.publish_at) <= now;
  return false;
}

export function videoAvailability(v: VideoRow) {
  if (v.status === "Archiviert") return "Archiviert";
  if (v.status === "Offline") return "Offline";
  if (v.status === "Entwurf") return "Entwurf";
  return isVideoPublic(v) ? "Öffentlich" : "Geplant";
}

/* ---------- Quellen ---------- */

export function youTubeId(url: string): string | null {
  const m =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(
      url.trim(),
    );
  return m?.[1] ?? null;
}

export function vimeoId(url: string): string | null {
  const m = /vimeo\.com\/(?:video\/)?(\d{6,})/.exec(url.trim());
  return m?.[1] ?? null;
}

/** Erlaubt sind ausschließlich http(s)-URLs — keine Datei-, Daten- oder Script-Schemata. */
export function isSafeHttpUrl(url: string) {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Prüft die Quelle. Gibt null zurück, wenn alles in Ordnung ist. */
export function validateSource(source: string, url: string | null): string | null {
  const value = (url ?? "").trim();
  if (!value) return "Es ist noch keine Videoquelle hinterlegt.";
  if (source === "upload") {
    if (!value.startsWith("/api/public/media/")) return "Bitte ein Video aus der Mediathek wählen.";
    return null;
  }
  if (!isSafeHttpUrl(value)) return "Bitte eine gültige http(s)-URL angeben.";
  if (source === "youtube" && !youTubeId(value)) return "Keine gültige YouTube-URL.";
  if (source === "vimeo" && !vimeoId(value)) return "Keine gültige Vimeo-URL.";
  return null;
}

export type VideoEmbed =
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "file"; src: string }
  | { kind: "link"; src: string }
  | { kind: "none" };

/** Offizielle Embed-Mechanismen; externe Videos werden niemals heruntergeladen. */
export function videoEmbed(source: string, url: string | null | undefined): VideoEmbed {
  const value = (url ?? "").trim();
  if (!value) return { kind: "none" };
  if (source === "youtube") {
    const id = youTubeId(value);
    return id ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` } : { kind: "none" };
  }
  if (source === "vimeo") {
    const id = vimeoId(value);
    return id ? { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` } : { kind: "none" };
  }
  if (source === "upload") return { kind: "file", src: value };
  if (!isSafeHttpUrl(value)) return { kind: "none" };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(value)) return { kind: "file", src: value };
  return { kind: "link", src: value };
}

export const videoFileName = (url: string | null | undefined) =>
  url ? decodeURIComponent(url.split("/").pop() ?? "") || null : null;
