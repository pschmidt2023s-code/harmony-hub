import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Play } from "lucide-react";
import { SongRow } from "@/components/SongRow";
import { usePlayer } from "@/components/player/player-context";
import { contentQueryOptions } from "@/lib/content";
import { publishedReleases, slugify } from "@/lib/release";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/releases/$slug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: ({ params }) => {
    const title = `Release ${params.slug.replace(/-/g, " ")} — TAYO`;
    return {
      meta: [
        { title },
        { name: "description", content: `Alle Infos, Tracks und Streaming-Links zum TAYO Release ${params.slug.replace(/-/g, " ")}.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `Tracks und Details zum TAYO Release ${params.slug.replace(/-/g, " ")}.` },
        { property: "og:type", content: "music.album" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ReleasePage,
});

function ReleasePage() {
  const { slug } = Route.useParams();
  const player = usePlayer();
  const { data } = useSuspenseQuery(contentQueryOptions);
  const release = publishedReleases(data.releases).find((r) => slugify(r.title) === slug);

  if (!release) throw notFound();

  const tracks = data.songs.filter((s) => s.album === release.title);
  const first = tracks[0];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-32 md:px-8">
      <Link to="/musik" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Zurück zur Musik
      </Link>
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <img
          src={release.cover}
          alt={`Cover ${release.title}`}
          width={800}
          height={800}
          className="w-full rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.4em] text-primary">
            {release.type} · {release.status}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold uppercase leading-tight sm:text-5xl">{release.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatDate(release.date)} · {release.tracks} {release.tracks === 1 ? "Track" : "Tracks"}
          </p>
          {release.description && <p className="mt-5 text-muted-foreground">{release.description}</p>}
          {first && (
            <button
              onClick={() => player.play(first, tracks)}
              className="glow mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              <Play className="size-4" /> Jetzt hören
            </button>
          )}
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="glass mt-12 rounded-2xl p-2 sm:p-4">
          {tracks.map((song, i) => (
            <SongRow key={song.id} song={song} list={tracks} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
