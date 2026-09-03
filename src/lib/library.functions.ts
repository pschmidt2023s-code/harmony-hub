import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 20 — Music Library (serverseitig).
 *
 * Alle Zugriffe laufen über die bestehende Auth-Middleware; die Daten gehören
 * ausschließlich dem angemeldeten Fan (RLS: `auth.uid() = user_id`).
 */

const songInput = z.object({ songId: z.string().min(1) });

/** Zuletzt gehört + Wiedergabepositionen des angemeldeten Fans. */
export const getLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [history, positions, favorites] = await Promise.all([
      context.supabase
        .from("play_history")
        .select("song_id, played_at")
        .order("played_at", { ascending: false })
        .limit(60),
      context.supabase.from("playback_positions").select("song_id, position_seconds, duration_seconds, updated_at"),
      context.supabase.from("favorites").select("song_id"),
    ]);

    if (history.error) throw history.error;
    if (positions.error) throw positions.error;
    if (favorites.error) throw favorites.error;

    return {
      history: history.data ?? [],
      positions: positions.data ?? [],
      favorites: (favorites.data ?? []).map((f) => f.song_id),
    };
  });

/** Einen Abspielvorgang protokollieren (nur für den eigenen Account). */
export const recordPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => songInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("play_history")
      .insert({ user_id: context.userId, song_id: data.songId });
    if (error) throw error;
    return { ok: true };
  });

const positionInput = z.object({
  songId: z.string().min(1),
  position: z.number().min(0),
  duration: z.number().min(0),
});

/**
 * Wiedergabeposition speichern. Nahezu vollständig gehörte Tracks werden aus
 * "Weiterhören" entfernt, statt einen sinnlosen Reststand zu speichern.
 */
export const savePlaybackPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => positionInput.parse(data))
  .handler(async ({ data, context }) => {
    const finished = data.duration > 0 && data.position >= data.duration * 0.97;
    if (finished || data.position < 15) {
      await context.supabase
        .from("playback_positions")
        .delete()
        .eq("user_id", context.userId)
        .eq("song_id", data.songId);
      return { stored: false };
    }
    const { error } = await context.supabase.from("playback_positions").upsert(
      {
        user_id: context.userId,
        song_id: data.songId,
        position_seconds: Math.round(data.position),
        duration_seconds: Math.round(data.duration),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,song_id" },
    );
    if (error) throw error;
    return { stored: true };
  });

/**
 * Audio-URLs exklusiver Tracks. Öffentlich werden diese URLs nie ausgeliefert
 * (siehe `content.functions.ts`); die Freigabe passiert nur hier, serverseitig,
 * für angemeldete Fans.
 */
export const getUnlockedAudio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("songs")
      .select("id, audio_url, release_id, status, access_level")
      .eq("access_level", "EXCLUSIVE")
      .eq("status", "Veröffentlicht");
    if (error) throw error;

    const releaseIds = [...new Set((data ?? []).map((s) => s.release_id).filter(Boolean))] as string[];
    const releases = releaseIds.length
      ? await context.supabase
          .from("releases")
          .select("id, status, release_date, publish_at")
          .in("id", releaseIds)
      : { data: [], error: null };
    if (releases.error) throw releases.error;

    const now = Date.now();
    // Release-Day-Unlock gilt auch für exklusive Tracks — dieselbe Regel wie öffentlich.
    const released = new Map(
      (releases.data ?? []).map((r) => {
        const dateReached = Date.parse(`${r.release_date}T00:00:00Z`) <= now;
        const open =
          r.status === "Veröffentlicht"
            ? dateReached
            : r.status === "Geplant" && r.publish_at
              ? Date.parse(r.publish_at) <= now
              : false;
        return [r.id, open] as const;
      }),
    );

    const out: Record<string, string> = {};
    for (const s of data ?? []) {
      if (!s.audio_url) continue;
      if (s.release_id && !released.get(s.release_id)) continue;
      out[s.id] = s.audio_url;
    }
    return out;
  });
