import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ReleaseRow = Database["public"]["Tables"]["releases"]["Row"];
export type SongRow = Database["public"]["Tables"]["songs"]["Row"];
export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];

export const RELEASE_STATUSES = [
  "Entwurf",
  "In Produktion",
  "Mixing",
  "Mastering",
  "Geplant",
  "Vorbestellung",
  "Veröffentlicht",
  "Archiviert",
] as const;

export const RELEASE_TYPES = ["Single", "EP", "Album", "Deluxe", "Mixtape"] as const;

export const STREAMING_SERVICES = [
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple Music" },
  { id: "youtube", label: "YouTube" },
  { id: "amazon", label: "Amazon Music" },
  { id: "deezer", label: "Deezer" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "tidal", label: "Tidal" },
  { id: "bandcamp", label: "Bandcamp" },
] as const;

export function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Serverzeit-unabhängige Vorschau der Sichtbarkeit (nur für Admin-Anzeige). */
export function isReleasePublic(r: Pick<ReleaseRow, "status" | "release_date" | "publish_at">) {
  const now = Date.now();
  const dateReached = Date.parse(`${r.release_date}T00:00:00Z`) <= now;
  if (r.status === "Veröffentlicht") return dateReached;
  if (r.status === "Geplant" && r.publish_at) return Date.parse(r.publish_at) <= now;
  return false;
}

export const adminReleasesQueryOptions = queryOptions({
  queryKey: ["admin", "releases"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("releases")
      .select("*")
      .order("release_date", { ascending: false });
    if (error) throw error;
    return data as ReleaseRow[];
  },
});

export const adminSongsQueryOptions = queryOptions({
  queryKey: ["admin", "songs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as SongRow[];
  },
});

export const adminVideosQueryOptions = queryOptions({
  queryKey: ["admin", "videos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as VideoRow[];
  },
});

export async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugifyTitle(base) || "release";
  const { data, error } = await supabase.from("releases").select("id, slug");
  if (error) throw error;
  const taken = new Set(
    (data ?? []).filter((r) => r.id !== ignoreId).map((r) => r.slug ?? ""),
  );
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

export function newReleaseId() {
  return `rel_${crypto.randomUUID().slice(0, 8)}`;
}

export async function saveRelease(
  values: Database["public"]["Tables"]["releases"]["Insert"],
  mode: "insert" | "update",
) {
  const q =
    mode === "insert"
      ? supabase.from("releases").insert(values)
      : supabase.from("releases").update(values).eq("id", values.id!);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteRelease(id: string) {
  const { error } = await supabase.from("releases").delete().eq("id", id);
  if (error) throw error;
}

/** Zentraler Upload aus der Medienbibliothek – es gibt nur dieses eine System. */
export { uploadMedia } from "@/lib/admin/media";
