import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminReleasesQueryOptions } from "@/lib/admin/releases";
import { adminSongListQueryOptions } from "@/lib/admin/songs";

/**
 * Zentrale Medienbibliothek.
 * Es wird ausschließlich der bestehende private Storage-Bucket "media" genutzt
 * (Lesen öffentlich über /api/public/media/*, Schreiben nur für Admins per RLS).
 * Es gibt bewusst KEINE zweite Storage- oder Medientabelle.
 */

export const MEDIA_FOLDERS = ["covers", "audio", "video", "uploads"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export type MediaKind = "image" | "audio" | "video" | "other";

export type MediaAsset = {
  path: string;
  folder: string;
  fileName: string;
  displayName: string;
  url: string;
  kind: MediaKind;
  mimeType: string | null;
  size: number | null;
  createdAt: string | null;
};

export const MEDIA_ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/svg+xml",
  audio: "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg",
  video: "video/mp4,video/webm,video/quicktime",
} as const;

export const MEDIA_ACCEPT_ALL = `${MEDIA_ACCEPT.image},${MEDIA_ACCEPT.audio},${MEDIA_ACCEPT.video}`;

export function kindFromMime(mime: string | null | undefined, fileName = ""): MediaKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "svg", "gif", "avif"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return "other";
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Dateiname für die Anzeige: `<uuid>-<originalname>.<ext>` → `<originalname>.<ext>`. */
export function displayNameFor(fileName: string) {
  const match = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i.exec(fileName);
  if (match?.[1]) return match[1];
  return fileName;
}

export function mediaPathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = "/api/public/media/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

type StorageEntry = {
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: { size?: number; mimetype?: string } | null;
};

async function listFolder(folder: string): Promise<MediaAsset[]> {
  const { data, error } = await supabase.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((e) => (e as StorageEntry).metadata)
    .map((raw) => {
      const e = raw as StorageEntry;
      const path = `${folder}/${e.name}`;
      const mime = e.metadata?.mimetype ?? null;
      return {
        path,
        folder,
        fileName: e.name,
        displayName: displayNameFor(e.name),
        url: `/api/public/media/${path}`,
        kind: kindFromMime(mime, e.name),
        mimeType: mime,
        size: e.metadata?.size ?? null,
        createdAt: e.created_at ?? e.updated_at ?? null,
      } satisfies MediaAsset;
    });
}

export async function listMedia(): Promise<MediaAsset[]> {
  const lists = await Promise.all(MEDIA_FOLDERS.map((f) => listFolder(f).catch(() => [] as MediaAsset[])));
  return lists.flat().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export const adminMediaQueryOptions = queryOptions({
  queryKey: ["admin", "media"],
  queryFn: listMedia,
  staleTime: 30_000,
});

/** Upload in den bestehenden Bucket; der Originalname bleibt im Pfad erhalten. */
export async function uploadMedia(file: File, folder: string) {
  const safe = file.name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(-80);
  const path = `${folder}/${crypto.randomUUID()}-${safe || "datei"}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return { path, url: `/api/public/media/${path}` };
}

export function folderForKind(kind: MediaKind): MediaFolder {
  if (kind === "image") return "covers";
  if (kind === "audio") return "audio";
  if (kind === "video") return "video";
  return "uploads";
}

export async function deleteMedia(path: string) {
  const { error } = await supabase.storage.from("media").remove([path]);
  if (error) throw error;
}

export type MediaUsage = { label: string; field: string };

/** Verwendungen kommen ausschließlich aus echten Datenbank-Referenzen. */
export function buildUsageIndex(
  releases: { title: string; cover_url: string | null }[],
  songs: { title: string; cover_url: string | null; audio_url: string | null }[],
  videos: { title: string; thumb_url: string | null; video_url: string | null }[],
) {
  const index = new Map<string, MediaUsage[]>();
  const add = (url: string | null, usage: MediaUsage) => {
    const path = mediaPathFromUrl(url);
    if (!path) return;
    index.set(path, [...(index.get(path) ?? []), usage]);
  };
  for (const r of releases) add(r.cover_url, { label: `Release: ${r.title}`, field: "Artwork" });
  for (const s of songs) {
    add(s.cover_url, { label: `Song: ${s.title}`, field: "Artwork" });
    add(s.audio_url, { label: `Song: ${s.title}`, field: "Audio" });
  }
  for (const v of videos) {
    add(v.thumb_url, { label: `Video: ${v.title}`, field: "Thumbnail" });
    add(v.video_url, { label: `Video: ${v.title}`, field: "Videodatei" });
  }
  return index;
}

export const adminVideosQueryOptions = queryOptions({
  queryKey: ["admin", "videos"],
  queryFn: async () => {
    const { data, error } = await supabase.from("videos").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
});

export const mediaSourceQueries = {
  releases: adminReleasesQueryOptions,
  songs: adminSongListQueryOptions,
  videos: adminVideosQueryOptions,
};
