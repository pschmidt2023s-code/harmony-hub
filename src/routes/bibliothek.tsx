import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart, History, ListPlus, Play, RotateCcw } from "lucide-react";
import { Section } from "@/components/Section";
import { usePlayer } from "@/components/player/player-context";
import { contentQueryOptions } from "@/lib/content";
import { useMusicLibrary } from "@/lib/library";
import { formatTime, type Song } from "@/lib/data";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/bibliothek")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    return seoHead({
      title: `Deine Bibliothek — ${s?.artist_name ?? "TAYO"}`,
      description:
        "Favoriten, zuletzt gehörte Songs und angefangene Tracks von TAYO an einem Ort — direkt im Player fortsetzen.",
      path: "/bibliothek",
      settings: s ?? null,
      noindex: true,
    });
  },
  component: LibraryPage,
});

function TrackCard({ song, hint, onPlay }: { song: Song; hint?: string; onPlay: () => void }) {
  const p = usePlayer();
  return (
    <li className="glass flex items-center gap-3 rounded-2xl p-3">
      <button onClick={onPlay} aria-label={`${song.title} abspielen`} className="relative shrink-0">
        <img src={song.cover} alt="" width={200} height={200} loading="lazy" className="size-14 rounded-xl object-cover" />
        <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/50 opacity-0 transition-opacity hover:opacity-100">
          <Play className="size-5" />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <p className="truncate text-xs text-muted-foreground">{hint ?? song.album}</p>
      </div>
      <button
        onClick={() => p.addToQueue(song)}
        aria-label={`${song.title} zur Warteschlange hinzufügen`}
        className="grid min-h-11 min-w-11 place-items-center text-muted-foreground transition-colors hover:text-primary"
      >
        <ListPlus className="size-4" />
      </button>
    </li>
  );
}

function LibraryPage() {
  const { data } = useSuspenseQuery(contentQueryOptions);
  const player = usePlayer();
  const lib = useMusicLibrary(player.userId, player.favorites);
  const playable = data.songs.filter((s) => !s.locked);

  return (
    <div className="pt-32">
      <Section eyebrow="Deine Bibliothek" title="Bibliothek">
        {!lib.signedIn && (
          <p className="mb-8 text-sm text-muted-foreground">
            Ohne Anmeldung werden Verlauf und Wiedergabepositionen nur lokal in diesem Browser gespeichert.{" "}
            <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
              Anmelden
            </Link>{" "}
            sichert deine Favoriten dauerhaft.
          </p>
        )}

        {lib.continueListening.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <RotateCcw className="size-4" /> Weiterhören
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lib.continueListening.map(({ song, position }) => (
                <TrackCard
                  key={song.id}
                  song={song}
                  hint={`Weiter bei ${formatTime(position)} von ${formatTime(song.duration)}`}
                  onPlay={() => {
                    player.play(song, playable);
                    player.seek(position);
                  }}
                />
              ))}
            </ul>
          </div>
        )}

        {lib.favorites.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <Heart className="size-4" /> Favoriten
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lib.favorites.map((song) => (
                <TrackCard key={song.id} song={song} onPlay={() => player.play(song, lib.favorites)} />
              ))}
            </ul>
          </div>
        )}

        {lib.recentlyPlayed.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <History className="size-4" /> Zuletzt gehört
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lib.recentlyPlayed.map((song) => (
                <TrackCard key={song.id} song={song} onPlay={() => player.play(song, playable)} />
              ))}
            </ul>
          </div>
        )}

        {lib.isEmpty && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Deine Bibliothek ist noch leer. Spiele einen Track ab oder markiere ihn als Favorit.
            </p>
            <Link
              to="/musik"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Musik entdecken
            </Link>
          </div>
        )}
      </Section>
    </div>
  );
}
