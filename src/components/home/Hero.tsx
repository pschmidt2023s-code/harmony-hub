import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ExternalLink, Play } from "lucide-react";
import heroFallback from "@/assets/hero-tayo.jpg";
import { usePlayer } from "@/components/player/player-context";
import { ReleaseCountdown } from "@/components/release/ReleaseCountdown";
import { releaseMoment } from "@/lib/release";
import { ARTIST, formatDate, type Release, type Song } from "@/lib/data";

/**
 * Cinematischer Hero mit klarer Journey: ein kommendes Release ist der
 * wichtigste Inhalt (Countdown + "Release entdecken"), sonst das neueste
 * veröffentlichte Release. Ohne Release: sauberer TAYO-Fallback.
 */
export function Hero({
  release,
  upcoming = null,
  songs,
}: {
  release: Release | null;
  upcoming?: Release | null;
  songs: Song[];
}) {
  const player = usePlayer();
  const queryClient = useQueryClient();
  const featured = upcoming ?? release;
  const isUpcoming = Boolean(upcoming);

  const releaseSongs = featured && !isUpcoming ? songs.filter((s) => s.album === featured.title) : [];
  const queue = releaseSongs.length ? releaseSongs : songs;
  const playable = isUpcoming ? undefined : queue[0];
  // Pre-Save nur mit echtem, hinterlegtem Link.
  const preSaveUrl = featured
    ? ((featured.links ?? {}) as Record<string, string>)["presave"]?.trim() || null
    : null;

  return (
    <section className="relative isolate flex min-h-[72svh] flex-col justify-end overflow-hidden sm:min-h-[80svh] md:min-h-[88svh]">
      <img
        src={featured?.cover ?? heroFallback}
        alt={featured ? `Cover ${featured.title}` : "TAYO Porträt"}
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
        {featured ? (
          <>
            <p className="animate-fade-in text-[11px] uppercase tracking-[0.4em] text-primary sm:text-xs sm:tracking-[0.5em]">
              {isUpcoming ? `Neues Release · ${formatDate(featured.date)}` : `${featured.type} · ${featured.status}`}
            </p>
            <h1 className="mt-4 max-w-3xl animate-fade-up text-[clamp(2.75rem,12vw,7rem)] font-extrabold uppercase leading-[0.92]">
              {featured.title}
            </h1>
            {isUpcoming ? (
              <ReleaseCountdown
                className="mt-6 animate-fade-up"
                variant="hero"
                target={releaseMoment(featured)}
                onExpire={() => void queryClient.invalidateQueries({ queryKey: ["site-content"] })}
              />
            ) : (
              <p className="mt-4 animate-fade-up text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {formatDate(featured.date)} · {featured.tracks} {featured.tracks === 1 ? "Track" : "Tracks"} ·{" "}
                {ARTIST.name}
              </p>
            )}
            {featured.description && (
              <p className="mt-5 max-w-lg animate-fade-up text-base text-muted-foreground">
                {featured.description}
              </p>
            )}
            <div className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {isUpcoming ? (
                <>
                  <Link
                    to="/releases/$slug"
                    params={{ slug: featured.slug }}
                    className="glow flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] sm:w-auto"
                  >
                    Release entdecken <ArrowUpRight className="size-4" />
                  </Link>
                  {preSaveUrl && (
                    <a
                      href={preSaveUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors hover:text-primary sm:w-auto"
                    >
                      Pre-Save <ExternalLink className="size-4" />
                    </a>
                  )}
                </>
              ) : (
                <>
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
                    params={{ slug: featured.slug }}
                    className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors hover:text-primary sm:w-auto"
                  >
                    Release ansehen <ArrowUpRight className="size-4" />
                  </Link>
                </>
              )}
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
