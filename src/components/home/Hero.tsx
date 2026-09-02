import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Play } from "lucide-react";
import heroFallback from "@/assets/hero-tayo.jpg";
import { usePlayer } from "@/components/player/player-context";
import { ARTIST, formatDate, type Release, type Song } from "@/lib/data";


/**
 * Cinematischer Hero. Zeigt das neueste veröffentlichte Release aus der Datenbank
 * oder – wenn es noch keins gibt – einen sauberen TAYO-Fallback ohne erfundene Daten.
 */
export function Hero({
  release,
  songs,
}: {
  release: Release | null;
  songs: Song[];
}) {
  const player = usePlayer();
  const releaseSongs = release ? songs.filter((s) => s.album === release.title) : [];
  const queue = releaseSongs.length ? releaseSongs : songs;
  const playable = queue[0];

  return (
    <section className="relative isolate flex min-h-[72svh] flex-col justify-end overflow-hidden sm:min-h-[80svh] md:min-h-[88svh]">
      <img
        src={release?.cover ?? heroFallback}
        alt={release ? `Cover ${release.title}` : "TAYO Porträt"}
        width={1600}
        height={1600}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 size-full scale-105 object-cover object-center opacity-90 md:object-[70%_center]"
      />
      {/* Ruhige Abdunklung: mobil von unten, ab md zusätzlich von links. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/25" />
      <div className="absolute inset-0 -z-10 md:bg-gradient-to-r md:from-background md:via-background/55 md:to-transparent" />
      <div
        className="absolute -bottom-24 left-1/2 -z-10 h-72 w-[min(90vw,42rem)] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-[image:var(--gradient-fade)]" />

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:pb-20 md:px-8 md:pb-28 md:pt-44">
        {release ? (
          <>
            <p className="animate-fade-in text-[11px] uppercase tracking-[0.4em] text-primary sm:text-xs sm:tracking-[0.5em]">
              {release.type} · {release.status}
            </p>
            <h1 className="mt-4 max-w-3xl animate-fade-up text-[clamp(2.75rem,12vw,7rem)] font-extrabold uppercase leading-[0.92]">
              {release.title}
            </h1>
            <p className="mt-4 animate-fade-up text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {formatDate(release.date)} · {release.tracks} {release.tracks === 1 ? "Track" : "Tracks"} · {ARTIST.name}
            </p>
            {release.description && (
              <p className="mt-5 max-w-lg animate-fade-up text-base text-muted-foreground">
                {release.description}
              </p>
            )}
            <div className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {playable && (
                <button
                  onClick={() => player.play(playable, queue)}
                  className="glow flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] sm:w-auto"
                >
                  <Play className="size-4" /> Jetzt hören
                </button>
              )}
              <Link
                to="/releases/$slug"
                params={{ slug: release.slug }}
                className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors hover:text-primary sm:w-auto"
              >
                Release ansehen <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="animate-fade-in text-[11px] uppercase tracking-[0.4em] text-primary sm:text-xs sm:tracking-[0.5em]">
              {ARTIST.tagline}
            </p>
            <h1 className="mt-4 animate-fade-up text-[clamp(3rem,16vw,8rem)] font-extrabold uppercase leading-[0.9] tracking-[0.08em]">
              {ARTIST.name}
            </h1>
            <p className="mt-5 max-w-lg animate-fade-up text-base text-muted-foreground">
              Musik. Visuals. Mehr in Kürze.
            </p>
            <div className="mt-9 animate-fade-up">
              <Link
                to="/musik"
                className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors hover:text-primary"
              >
                Zur Musik <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
