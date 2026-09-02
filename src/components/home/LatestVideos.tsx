import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Section } from "@/components/Section";
import { formatDate, type Video } from "@/lib/data";

/** Neueste Videos – großes Feature-Video plus zwei kleinere. Ohne Videos: keine Sektion. */
export function LatestVideos({ videos }: { videos: Video[] }) {
  if (!videos.length) return null;
  const [feature, ...rest] = videos.slice(0, 3);

  return (
    <Section
      eyebrow="Visuals"
      title="Neueste Videos"
      action={
        <Link to="/videos" className="hidden text-sm text-primary hover:underline sm:block">
          Alle Videos
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <VideoCard video={feature} large />
        {rest.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {rest.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function VideoCard({ video, large = false }: { video: Video; large?: boolean }) {
  return (
    <Link to="/videos" className="group relative block overflow-hidden rounded-2xl">
      <img
        src={video.thumb}
        alt={video.title}
        width={1280}
        height={720}
        loading={large ? "eager" : "lazy"}
        decoding="async"
        className="aspect-video size-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
      <span className="glass-strong absolute right-4 top-4 grid size-10 place-items-center rounded-full text-primary opacity-0 transition-opacity group-hover:opacity-100">
        <Play className="size-4" />
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[11px] uppercase tracking-widest text-primary">
          {video.category}
          {video.song && ` · ${video.song}`}
        </p>
        <p className={large ? "mt-2 text-xl font-semibold sm:text-2xl" : "mt-1 font-medium"}>
          {video.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(video.date)}</p>
      </div>
    </Link>
  );
}
