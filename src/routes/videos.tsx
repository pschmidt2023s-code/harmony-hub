import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Play } from "lucide-react";
import { Section } from "@/components/Section";
import { VIDEOS, formatDate } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Videos — Musikvideos & Visualizer von TAYO" },
      {
        name: "description",
        content:
          "Musikvideos, Visualizer, Lyric Videos, Live-Performances und Behind-the-Scenes von TAYO.",
      },
      { property: "og:title", content: "Videos — TAYO" },
      { property: "og:description", content: "Musikvideos, Visualizer und Live-Performances von TAYO." },
    ],
  }),
  component: VideosPage,
});

const CATS = ["Alle", "Musikvideo", "Visualizer", "Lyric Video", "Live", "Behind the Scenes", "Short"] as const;

function VideosPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Alle");
  const list = cat === "Alle" ? VIDEOS : VIDEOS.filter((v) => v.category === cat);

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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <article key={v.id} className="glass group overflow-hidden rounded-2xl">
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
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}