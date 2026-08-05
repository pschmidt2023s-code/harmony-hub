import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Calendar, Play } from "lucide-react";
import hero from "@/assets/hero-tayo.jpg";
import { Section } from "@/components/Section";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SongRow } from "@/components/SongRow";
import { usePlayer } from "@/components/player/player-context";
import { ARTIST, PRODUCTS, RELEASES, SONGS, TOUR, VIDEOS, formatDate } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TAYO — Musik, Releases & Merch" },
      {
        name: "description",
        content:
          "Offizielle Plattform von TAYO: neue Single Midnight Gold, Musikvideos, Tourdaten und limitiertes Merch.",
      },
      { property: "og:title", content: "TAYO — Musik, Releases & Merch" },
      {
        property: "og:description",
        content: "Neue Single, Musikvideos, Tourdaten und limitiertes Merch von TAYO.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const player = usePlayer();
  const featured = SONGS[0]!;
  const upcoming = RELEASES.filter((r) => r.status !== "Veröffentlicht");

  return (
    <>
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={hero}
          alt="TAYO im Porträt mit warmem Gegenlicht"
          width={1600}
          height={1200}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[image:var(--gradient-fade)]" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-28 pt-40 md:px-8">
          <p className="animate-fade-in text-xs uppercase tracking-[0.5em] text-primary">
            Neue Single · out now
          </p>
          <h1 className="mt-5 max-w-3xl animate-fade-up text-6xl font-extrabold leading-[0.92] sm:text-7xl md:text-8xl">
            MIDNIGHT<br />
            <span className="text-gradient">GOLD</span>
          </h1>
          <p className="mt-6 max-w-lg animate-fade-up text-base text-muted-foreground">
            {ARTIST.name} — {ARTIST.tagline}. {ARTIST.bio}
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-3">
            <button
              onClick={() => player.play(featured, SONGS)}
              className="glow flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <Play className="size-4" /> Jetzt hören
            </button>
            <Link
              to="/musik"
              className="glass flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors hover:text-primary"
            >
              Alle Songs <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <Section
        eyebrow="Bibliothek"
        title="Aktuelle Tracks"
        action={
          <Link to="/musik" className="hidden text-sm text-primary hover:underline sm:block">
            Alle ansehen
          </Link>
        }
      >
        <div className="glass rounded-2xl p-2 sm:p-4">
          {SONGS.slice(0, 5).map((song, i) => (
            <SongRow key={song.id} song={song} list={SONGS} index={i} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Release Kalender" title="Kommende Releases">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((r) => (
            <article key={r.id} className="glass group overflow-hidden rounded-2xl">
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={r.cover}
                  alt={`Cover ${r.title}`}
                  width={800}
                  height={800}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="glass-strong absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                  {r.status}
                </span>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" /> {formatDate(r.date)} · {r.type} · {r.tracks} Tracks
                </p>
                <h3 className="mt-2 text-xl font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Store"
        title="Merch Highlights"
        action={
          <Link to="/shop" className="hidden text-sm text-primary hover:underline sm:block">
            Zum Shop
          </Link>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <Link key={p.id} to="/shop" className="glass group overflow-hidden rounded-2xl">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-primary">{p.price} €</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Visuals"
        title="Neueste Videos"
        action={
          <Link to="/videos" className="hidden text-sm text-primary hover:underline sm:block">
            Alle Videos
          </Link>
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          {VIDEOS.slice(0, 3).map((v) => (
            <Link key={v.id} to="/videos" className="group relative overflow-hidden rounded-2xl">
              <img
                src={v.thumb}
                alt={v.title}
                width={800}
                height={800}
                loading="lazy"
                className="aspect-video size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs uppercase tracking-widest text-primary">{v.category}</p>
                <p className="mt-1 font-medium">{v.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Live" title="Tourdaten 2026">
        <div className="glass divide-y divide-border/60 rounded-2xl">
          {TOUR.map((t) => (
            <div
              key={t.date}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-secondary/50"
            >
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {t.city} <span className="text-muted-foreground">· {t.venue}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <span
                className={
                  t.status === "Ausverkauft"
                    ? "shrink-0 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
                    : "shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                }
              >
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <section className="section-pad">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="glass relative overflow-hidden rounded-3xl px-6 py-16 text-center md:px-16">
            <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 animate-float rounded-full bg-primary/25 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-semibold sm:text-5xl">Bleib im Loop</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                Release-Alerts, exklusive Pre-Sales, Demos und Backstage-Content — direkt in dein Postfach.
              </p>
              <NewsletterForm
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                inputClassName="glass min-w-0 flex-1 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                buttonClassName="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
