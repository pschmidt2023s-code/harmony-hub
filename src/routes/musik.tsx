import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { Section } from "@/components/Section";
import { SongRow } from "@/components/SongRow";
import { usePlayer } from "@/components/player/player-context";
import { SONGS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/musik")({
  head: () => ({
    meta: [
      { title: "Musik — TAYO Diskografie & Streaming" },
      {
        name: "description",
        content:
          "Alle Songs von TAYO mit Credits, Lyrics, BPM, Tonart und Links zu Spotify, Apple Music, YouTube und Deezer.",
      },
      { property: "og:title", content: "Musik — TAYO Diskografie" },
      { property: "og:description", content: "Songs, Credits, Lyrics und Streaming-Links von TAYO." },
    ],
  }),
  component: MusicPage,
});

const FILTERS = ["Alle", "Single", "EP", "Album"] as const;

function MusicPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Alle");
  const [selected, setSelected] = useState(SONGS[0]!.id);
  const player = usePlayer();
  const list = filter === "Alle" ? SONGS : SONGS.filter((s) => s.type === filter);
  const detail = SONGS.find((s) => s.id === selected)!;

  return (
    <div className="pt-32">
      <Section eyebrow="Bibliothek" title="Musik">
        <div className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-5 py-2 text-sm transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="glass rounded-2xl p-2 sm:p-4">
            {list.map((song, i) => (
              <button key={song.id} onClick={() => setSelected(song.id)} className="block w-full text-left">
                <SongRow song={song} list={list} index={i} />
              </button>
            ))}
          </div>

          <aside className="glass h-fit rounded-2xl p-6 lg:sticky lg:top-28">
            <img
              src={detail.cover}
              alt={`Cover ${detail.album}`}
              width={800}
              height={800}
              loading="lazy"
              className="w-full rounded-xl shadow-[var(--shadow-elevated)]"
            />
            <h3 className="mt-6 text-2xl font-semibold">{detail.title}</h3>
            <p className="text-sm text-muted-foreground">
              {detail.album} · {detail.type}
            </p>
            <button
              onClick={() => player.play(detail, list)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <Play className="size-4" /> Abspielen
            </button>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Genre", detail.genre],
                ["BPM", String(detail.bpm)],
                ["Tonart", detail.key],
                ["Stimmung", detail.mood],
                ["Producer", detail.producer],
                ["Songwriter", detail.songwriter],
                ["ISRC", detail.isrc],
                ["Explicit", detail.explicit ? "Ja" : "Nein"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                  <dd className="mt-1">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Lyrics</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {detail.lyrics.map((l) => (
                <p key={l.time}>{l.line}</p>
              ))}
            </div>

            <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Streaming</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(detail.links).map(([k, url]) => (
                <a
                  key={k}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="glass rounded-full px-4 py-2 text-xs capitalize transition-colors hover:text-primary"
                >
                  {k}
                </a>
              ))}
            </div>
          </aside>
        </div>
      </Section>
    </div>
  );
}