import { useState } from "react";
import { ExternalLink, VideoOff } from "lucide-react";
import { videoEmbed } from "@/lib/admin/videos";

type Props = {
  source: string;
  url: string | null | undefined;
  poster?: string | null;
  title: string;
};

/**
 * Einheitliche Videowiedergabe für öffentliche Seiten und Admin-Vorschau.
 * YouTube/Vimeo laufen über die offiziellen Embeds, hochgeladene Dateien über
 * die bestehende Medien-Route. Es entsteht kein zweiter Audio-Player.
 */
export function VideoPlayer({ source, url, poster, title }: Props) {
  const embed = videoEmbed(source, url);
  const [failed, setFailed] = useState(false);

  if (embed.kind === "none" || failed) {
    return (
      <div className="glass grid aspect-video w-full place-items-center rounded-2xl text-center">
        <div className="px-6 py-8">
          <VideoOff className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Das Video kann gerade nicht abgespielt werden.
          </p>
          {embed.kind !== "none" && (
            <a
              href={embed.src}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Extern öffnen <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (embed.kind === "link") {
    return (
      <a
        href={embed.src}
        target="_blank"
        rel="noreferrer noopener"
        className="glass group relative block aspect-video w-full overflow-hidden rounded-2xl"
      >
        {poster && <img src={poster} alt="" className="size-full object-cover opacity-70" />}
        <span className="absolute inset-0 grid place-items-center text-sm text-primary">
          Video extern ansehen <ExternalLink className="ml-1.5 inline size-3.5" />
        </span>
      </a>
    );
  }

  if (embed.kind === "file") {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        onError={() => setFailed(true)}
        className="aspect-video w-full rounded-2xl bg-black"
      >
        <source src={embed.src} />
      </video>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        src={embed.src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    </div>
  );
}
