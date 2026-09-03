import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { zonedMidnight } from "@/lib/release";

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

  const [songs, releases, videos, settings] = await Promise.all([
    supabasePublic.from("songs").select("*").order("sort_order", { ascending: true }),
    supabasePublic.from("releases").select("*").order("release_date", { ascending: true }),
    supabasePublic.from("videos").select("*").order("sort_order", { ascending: true }),
    // Öffentliche Standard-SEO-Werte aus der bestehenden Einstellungstabelle (Phase 2),
    // bewusst in derselben Abfragerunde — keine zusätzliche Anfrage pro Seitenaufruf.
    supabasePublic
      .from("site_settings")
      .select(
        "artist_name, site_name, site_title, site_description, canonical_base_url, default_og_image, logo_url, favicon_url, default_locale, theme_color",
      )
      .eq("id", 1)
      .maybeSingle(),
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

  /**
   * Video-Sichtbarkeit (Serverzeit): Entwürfe, geplante Videos vor ihrem Zeitpunkt,
   * Offline- und archivierte Videos werden öffentlich nie ausgeliefert.
   */
  const videoVisible = (v: { status: string; publish_at: string | null; video_date: string }) => {
    const t = now.getTime();
    if (v.status === "Veröffentlicht")
      return v.publish_at ? Date.parse(v.publish_at) <= t : Date.parse(`${v.video_date}T00:00:00Z`) <= t;
    if (v.status === "Geplant" && v.publish_at) return Date.parse(v.publish_at) <= t;
    return false;
  };

  /**
   * Phase 20 — Access Level.
   * EXCLUSIVE-Tracks werden öffentlich ohne Audio-URL ausgeliefert. Die Freigabe
   * erfolgt ausschließlich serverseitig über `getUnlockedAudio` (angemeldete Fans).
   */
  const publicSong = <T extends { access_level?: string | null; audio_url: string | null }>(s: T) =>
    (s.access_level ?? "PUBLIC") === "EXCLUSIVE"
      ? { ...s, audio_url: null, locked: true as const }
      : { ...s, locked: false as const };

  /**
   * Release-Day-Locked: Tracks eines öffentlich angekündigten, aber noch nicht
   * erschienenen Releases dürfen als Titel sichtbar sein — niemals mit Audio
   * oder Lyrics. Dieselbe zentrale Sichtbarkeitslogik (`isPublic`) entscheidet.
   */
  const announced = new Set(
    releaseRows
      .filter(
        (r) =>
          !r.is_public &&
          ["Geplant", "Vorbestellung", "Veröffentlicht"].includes(r.status) &&
          Date.parse(`${r.release_date}T00:00:00Z`) > now.getTime(),
      )
      .map((r) => r.id),
  );

  const lockedSongs = (songs.data ?? [])
    .filter((s) => s.status === "Veröffentlicht" && s.release_id && announced.has(s.release_id))
    .map((s) => ({ ...s, audio_url: null, lyrics: [], locked: true as const }));

  return {
    songs: (songs.data ?? []).filter(songVisible).map(publicSong),
    lockedSongs,
    releases: releaseRows,
    videos: (videos.data ?? []).filter(videoVisible),
    settings: settings.data ?? null,
  };
});

