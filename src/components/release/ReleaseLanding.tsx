import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/player/player-context";
import { Tracklist } from "@/components/release/Tracklist";
import { ShareButton } from "@/components/release/ShareButton";
import type { SiteContent } from "@/lib/content";
import { publishedReleases } from "@/lib/release";
import {
  releaseCredits,
  releaseGenres,
  releaseProducts,
  releaseTracks,
  releaseVideos,
  streamingServices,
  totalDuration,
} from "@/lib/release-detail";
import { useAccentSource } from "@/lib/accent-override";
import { ARTIST, PRODUCTS, formatDate, formatTime, type Release } from "@/lib/data";

export function ReleaseLanding({ release, content }: { release: Release; content: SiteContent }) {
  const player = usePlayer();
  // Akzentfarbe dieser Seite = Cover DIESES Releases (Phase-2-System, nur andere Quelle).
  useAccentSource(release.cover);

  const tracks = releaseTracks(content.songs, release);
  const services = streamingServices(tracks, release);
  const credits = releaseCredits(tracks, release);
  const genres = releaseGenres(tracks);
  const videos = releaseVideos(content.videos, release, tracks);
  const products = releaseProducts(PRODUCTS, release, tracks);
  const runtime = totalDuration(tracks);
  const playing = player.playing && tracks.some((t) => t.id === player.current?.id);

  const playRelease = () => {
    if (!tracks.length) return;
    if (playing) return player.toggle();
    player.play(tracks[0]!, tracks);
  };

  const more = publishedReleases(content.releases).filter((r) => r.id !== release.id).slice(0, 3);

  const details: { label: string; value: string }[] = [
    { label: "Typ", value: release.type },
    { label: "Erschienen", value: formatDate(release.date) },
    ...(tracks.length ? [{ label: "Tracks", value: String(tracks.length) }] : []),
    ...(runtime ? [{ label: "Laufzeit", value: formatTime(runtime) }] : []),
    ...(genres.length ? [{ label: "Genre", value: genres.join(", ") }] : []),
    { label: "Artist", value: ARTIST.name },
  ];

  return (
    <div className="pb-32">
      {/* ---------------------------------- Hero --------------------------------- */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={release.cover}
            alt=""
            aria-hidden
            className="size-full scale-110 object-cover opacity-30 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>

        <div className="mx-auto max-w-6xl px-5 pb-14 pt-28 md:px-8 md:pb-20 md:pt-36">
          <Link
            to="/musik"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Zurück zur Musik
          </Link>

          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-end md:gap-12">
            <div className="animate-scale-in relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 shadow-[0_30px_80px_-40px_var(--accent-alpha,rgba(0,0,0,0.6))]">
              <img
                src={release.cover}
                alt={`Cover von ${release.title}`}
                width={1000}
                height={1000}
                className="size-full object-cover"
              />
            </div>

            <div className="min-w-0 animate-fade-up">
              <p className="text-xs uppercase tracking-[0.4em] text-primary">{release.type}</p>
              <h1 className="mt-3 break-words text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl md:text-7xl">
                {release.title}
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                {ARTIST.name} · {formatDate(release.date)}
                {tracks.length > 0 && ` · ${tracks.length} ${tracks.length === 1 ? "Track" : "Tracks"}`}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {tracks.length > 0 && (
                  <button
                    onClick={playRelease}
                    className="glow inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
                  >
                    {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {playing ? "Pause" : "Release abspielen"}
                  </button>
                )}
                {services.length > 0 && (
                  <a
                    href={services[0]!.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition-colors hover:text-primary"
                  >
                    Auf {services[0]!.label} hören <ExternalLink className="size-4" />
                  </a>
                )}
                <ShareButton title={`${ARTIST.name} — ${release.title}`} text={release.description || undefined} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-14 px-5 md:px-8">
        {tracks.length > 0 && (
          <Block title="Tracklist">
            <Tracklist tracks={tracks} />
          </Block>
        )}

        {services.length > 1 && (
          <Block title="Streaming">
            <div className="flex flex-wrap gap-3">
              {services.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm transition-colors hover:text-primary"
                >
                  {s.label} <ExternalLink className="size-3.5" />
                </a>
              ))}
            </div>
          </Block>
        )}

        {release.description?.trim() && (
          <Block title="Über das Release">
            <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {release.description}
            </p>
          </Block>
        )}

        <Block title="Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {details.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{d.label}</dt>
                <dd className="mt-1 break-words text-sm font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Block>

        {credits.length > 0 && (
          <Block title="Credits">
            <dl className="grid gap-5 sm:grid-cols-2">
              {credits.map((c) => (
                <div key={c.role} className="min-w-0">
                  <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{c.role}</dt>
                  <dd className="mt-1 break-words text-sm">{c.names.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </Block>
        )}

        {videos.length > 0 && (
          <Block title="Video">
            <div className="grid gap-5 sm:grid-cols-2">
              {videos.map((v) => (
                <Link
                  key={v.id}
                  to="/videos/$slug"
                  params={{ slug: v.slug }}
                  className="group relative block overflow-hidden rounded-2xl border border-border/60"
                >
                  <img
                    src={v.thumb}
                    alt={v.title}
                    width={1280}
                    height={720}
                    loading="lazy"
                    className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Play className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{v.title}</span>
                      <span className="block text-xs text-muted-foreground">{v.category}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Block>
        )}

        {products.length > 0 && (
          <Block title="Shop the Release">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {products.map((p) => (
                <Link key={p.id} to="/shop" className="group min-w-0">
                  <div className="overflow-hidden rounded-2xl border border-border/60">
                    <img
                      src={p.image}
                      alt={p.name}
                      width={800}
                      height={800}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 truncate text-sm font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.price} €</p>
                </Link>
              ))}
            </div>
          </Block>
        )}

        {more.length > 0 && (
          <Block title="Mehr von TAYO">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              {more.map((r) => (
                <Link
                  key={r.id}
                  to="/releases/$slug"
                  params={{ slug: r.slug }}
                  className="group min-w-0"
                >
                  <div className="overflow-hidden rounded-2xl border border-border/60">
                    <img
                      src={r.cover}
                      alt={`Cover von ${r.title}`}
                      width={800}
                      height={800}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 truncate text-sm font-medium uppercase">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.type} · {formatDate(r.date)}
                  </p>
                </Link>
              ))}
            </div>
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-6 text-xs uppercase tracking-[0.4em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
