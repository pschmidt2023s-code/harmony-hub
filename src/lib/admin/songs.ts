import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { slugifyTitle } from "./releases";

export type SongRow = Database["public"]["Tables"]["songs"]["Row"];
export type SongInsert = Database["public"]["Tables"]["songs"]["Insert"];

/** Lebenszyklus eines Songs — bewusst identisch gedacht zum Release-Lifecycle. */
export const SONG_STATUSES = ["Entwurf", "Geplant", "Veröffentlicht", "Archiviert"] as const;

export const SONG_TYPES = ["Single", "EP", "Album"] as const;

export type SongCredit = { role: string; names: string };
export type LyricLine = { time: number; line: string };

export const SONG_CREDIT_ROLES = [
  "Written by",
  "Produced by",
  "Vocals",
  "Additional Production",
  "Mixing",
  "Mastering",
] as const;

export const adminSongListQueryOptions = queryOptions({
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

export function newSongId() {
  return `song_${crypto.randomUUID().slice(0, 8)}`;
}

export async function uniqueSongSlug(base: string, ignoreId?: string) {
  const root = slugifyTitle(base) || "song";
  const { data, error } = await supabase.from("songs").select("id, slug");
  if (error) throw error;
  const taken = new Set((data ?? []).filter((s) => s.id !== ignoreId).map((s) => s.slug ?? ""));
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

export async function saveSong(values: SongInsert, mode: "insert" | "update") {
  const q =
    mode === "insert"
      ? supabase.from("songs").insert(values)
      : supabase.from("songs").update(values).eq("id", values.id!);
  const { error } = await q;
  if (error) throw error;
}

/** Nur Statuswechsel — Audio, Lyrics, Credits und Zuordnungen bleiben erhalten. */
export async function setSongStatus(id: string, status: string) {
  const { error } = await supabase.from("songs").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function setSongRelease(id: string, releaseId: string | null, album: string) {
  const { error } = await supabase
    .from("songs")
    .update({ release_id: releaseId, album })
    .eq("id", id);
  if (error) throw error;
}

/** Anzeige-Hinweis im Admin (Serverzeit entscheidet öffentlich final). */
export function songAvailability(
  song: Pick<SongRow, "status" | "release_id" | "audio_url">,
  releasePublic: boolean | null,
) {
  if (song.status === "Archiviert") return "Archiviert";
  if (song.status === "Entwurf") return "Entwurf";
  if (song.release_id && releasePublic === false) return "Wartet auf Release";
  if (song.status === "Geplant") return "Geplant";
  return "Öffentlich";
}

/* ---------- Lyrics ---------- */

const stamp = (t: number) =>
  `[${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}]`;

/** Lyrics-Objekte -> Text. Zeilen mit Zeitmarke behalten ihre Marke. */
export function lyricsToText(lyrics: LyricLine[]) {
  return lyrics.map((l) => (l.time > 0 ? `${stamp(l.time)} ${l.line}` : l.line)).join("\n");
}

/** Text -> Lyrics-Objekte. Leerzeilen und Einrückungen bleiben erhalten. */
export function textToLyrics(text: string): LyricLine[] {
  if (!text.trim()) return [];
  return text.split("\n").map((raw) => {
    const m = raw.match(/^\s*\[(\d+):(\d{1,2})(?:\.\d+)?\]\s?(.*)$/);
    if (m) return { time: Number(m[1]) * 60 + Number(m[2]), line: m[3] ?? "" };
    return { time: 0, line: raw };
  });
}

/* ---------- Audio ---------- */

export const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/wav,audio/aac,audio/ogg,audio/flac,.mp3,.m4a,.wav,.aac,.ogg,.flac";

/** Dauer aus der Datei lesen; bei Fehlschlag null (niemals raten). */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export function audioFileName(url: string | null) {
  if (!url) return null;
  return decodeURIComponent(url.split("/").pop() ?? "") || null;
}
