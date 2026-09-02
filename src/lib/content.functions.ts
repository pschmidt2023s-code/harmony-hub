import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Öffentliche Sichtbarkeit wird IMMER serverseitig (Serverzeit) bestimmt.
 * - "Veröffentlicht" + Datum erreicht  -> öffentlich
 * - "Geplant" + publish_at erreicht    -> öffentlich (automatische Planung)
 * Alles andere (Entwurf, Produktionsstatus, Archiviert) ist nicht öffentlich.
 */
function isPublic(r: { status: string; release_date: string; publish_at: string | null }, now: Date) {
  const dateReached = Date.parse(`${r.release_date}T00:00:00Z`) <= now.getTime();
  if (r.status === "Veröffentlicht") return dateReached;
  if (r.status === "Geplant" && r.publish_at) return Date.parse(r.publish_at) <= now.getTime();
  return false;
}

export const getContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const [songs, releases, videos] = await Promise.all([
    supabasePublic.from("songs").select("*").order("sort_order", { ascending: true }),
    supabasePublic.from("releases").select("*").order("release_date", { ascending: true }),
    supabasePublic.from("videos").select("*").order("sort_order", { ascending: true }),
  ]);

  if (songs.error) throw songs.error;
  if (releases.error) throw releases.error;
  if (videos.error) throw videos.error;

  const now = new Date();
  const releaseRows = (releases.data ?? []).map((r) => ({ ...r, is_public: isPublic(r, now) }));
  const publicReleases = new Map(releaseRows.map((r) => [r.id, r.is_public] as const));

  /**
   * Song-Sichtbarkeit: Der Song selbst muss veröffentlicht sein UND — falls er
   * zu einem Release gehört — das Release muss öffentlich sein (Release-Day-Unlock).
   */
  const songVisible = (s: { status: string; release_id: string | null }) => {
    if (s.status !== "Veröffentlicht") return false;
    if (s.release_id) return publicReleases.get(s.release_id) ?? false;
    return true;
  };

  return {
    songs: (songs.data ?? []).filter(songVisible),
    releases: releaseRows,
    videos: videos.data,
  };
});

