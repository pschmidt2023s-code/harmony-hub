import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Play } from "lucide-react";
import { Section } from "@/components/Section";
import { formatDate } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { cn } from "@/lib/utils";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/videos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    return seoHead({
      title: `Videos — Musikvideos & Visualizer von ${s?.artist_name ?? "TAYO"}`,
      description:
        "Musikvideos, Visualizer, Lyric Videos, Live-Performances und Behind-the-Scenes von TAYO.",
      path: "/videos",
      settings: s ?? null,
    });
  },
  component: VideosPage,
});

const CATS = ["Alle", "Musikvideo", "Visualizer", "Lyric Video", "Live", "Behind the Scenes", "Short"] as const;

function VideosPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Alle");
  const { data } = useSuspenseQuery(contentQueryOptions);
  const list = cat === "Alle" ? data.videos : data.videos.filter((v) => v.category === cat);

  return (
    <div className="pt-32">
      <Section eyebrow="Visuals" title="Videothek">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full px-5 py-2 text-sm transition-colors",
                cat === c ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {list.length === 0 && (
          <div className="glass rounded-2xl px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {data.videos.length === 0
                ? "Aktuell sind keine Videos veröffentlicht."
                : "Keine Videos in dieser Kategorie."}
            </p>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <Link
              key={v.id}
              to="/videos/$slug"
              params={{ slug: v.slug }}
              className="glass group block overflow-hidden rounded-2xl"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={v.thumb}
                  alt={v.title}
                  width={800}
                  height={800}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="glass-strong grid size-14 place-items-center rounded-full">
                    <Play className="size-5 text-primary" />
                  </span>
                </span>
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-primary">{v.category}</p>
                <h3 className="mt-2 font-medium">{v.title}</h3>
                <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" /> {v.views}
                  </span>
                  <span>{formatDate(v.date)}</span>
                  <span>· {v.song}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}