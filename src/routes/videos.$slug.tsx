import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Play, Share2 } from "lucide-react";
import { Section } from "@/components/Section";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { contentQueryOptions } from "@/lib/content";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/videos/$slug")({
  loader: async ({ context, params }) => {
    const content = await context.queryClient.ensureQueryData(contentQueryOptions);
    const video = content.videos.find((v) => v.slug === params.slug || v.id === params.slug);
    if (!video) throw notFound();
    return { video };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Video nicht verfügbar — TAYO" }, { name: "robots", content: "noindex" }] };
    }
    const v = loaderData.video;
    const title = v.seoTitle || `${v.title} — ${v.category} von TAYO`;
    const description =
      v.seoDescription || v.description || `${v.category} von TAYO: ${v.title}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="pt-32">
      <Section eyebrow="Visuals" title="Video nicht gefunden">
        <p className="text-sm text-muted-foreground">
          Dieses Video ist nicht (mehr) öffentlich verfügbar.
        </p>
        <Link to="/videos" className="mt-6 inline-flex text-sm text-primary hover:underline">
          Zur Videothek
        </Link>
      </Section>
    </div>
  ),
  component: VideoDetailPage,
});

function VideoDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(contentQueryOptions);
  const [copied, setCopied] = useState(false);

  const video = data.videos.find((v) => v.slug === slug || v.id === slug);
  if (!video) return null;

  const release = video.releaseId ? data.releases.find((r) => r.id === video.releaseId && r.isPublic) : undefined;
  const song = video.songId ? data.songs.find((s) => s.id === video.songId) : undefined;
  const related = data.videos
    .filter((v) => v.id !== video.id)
    .filter((v) => (video.releaseId && v.releaseId === video.releaseId) || v.category === video.category)
    .slice(0, 3);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
        return;
      } catch {
        /* Abbruch durch den Nutzer */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-32">
      <Section eyebrow={video.category} title={video.title}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <VideoPlayer source={video.source} url={video.url} poster={video.thumb} title={video.title} />

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDate(video.date)}</span>
              {song && <span>· {song.title}</span>}
              {release && <span>· {release.title}</span>}
              <button
                onClick={() => void share()}
                className="glass ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs hover:text-primary"
              >
                {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
                {copied ? "Link kopiert" : "Teilen"}
              </button>
            </div>

            {video.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed">{video.description}</p>
            )}
          </div>

          <aside className="grid gap-5">
            {release && (
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Release</p>
                <Link
                  to="/releases/$slug"
                  params={{ slug: release.slug }}
                  className="mt-3 flex items-center gap-3 hover:text-primary"
                >
                  <img src={release.cover} alt="" className="size-14 rounded-xl object-cover" loading="lazy" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{release.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(release.date)}</span>
                  </span>
                </Link>
              </div>
            )}
            {song && (
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Song</p>
                <p className="mt-3 text-sm font-medium">{song.title}</p>
                <Link to="/musik" className="mt-1 inline-flex text-xs text-primary hover:underline">
                  Zur Musik
                </Link>
              </div>
            )}
            {related.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Weitere Videos</p>
                <div className="mt-3 grid gap-3">
                  {related.map((v) => (
                    <Link
                      key={v.id}
                      to="/videos/$slug"
                      params={{ slug: v.slug }}
                      className="group flex items-center gap-3 hover:text-primary"
                    >
                      <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg">
                        <img src={v.thumb} alt="" loading="lazy" className="size-full object-cover" />
                        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                          <Play className="size-4 text-primary" />
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{v.title}</span>
                        <span className="block text-xs text-muted-foreground">{v.category}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </Section>
    </div>
  );
}
