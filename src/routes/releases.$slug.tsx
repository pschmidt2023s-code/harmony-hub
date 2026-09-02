import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ReleaseLanding } from "@/components/release/ReleaseLanding";
import { contentQueryOptions, type SiteContent } from "@/lib/content";
import { publishedReleases } from "@/lib/release";
import { ARTIST, formatDate, type Release } from "@/lib/data";

const findRelease = (content: SiteContent | undefined, slug: string): Release | null =>
  content ? (publishedReleases(content.releases).find((r) => r.slug === slug) ?? null) : null;

export const Route = createFileRoute("/releases/$slug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: ({ params, loaderData }) => {
    const release = findRelease(loaderData as SiteContent | undefined, params.slug);
    if (!release) {
      return {
        meta: [{ title: "Release nicht gefunden — TAYO" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = release.seoTitle?.trim() || `TAYO — ${release.title}`;
    const description =
      release.seoDescription?.trim() ||
      release.shortDescription?.trim() ||
      release.description?.trim() ||
      `${release.type} von TAYO, erschienen am ${formatDate(release.date)}. Tracks, Credits und Streaming-Links.`;
    const url = `/releases/${params.slug}`;
    const absoluteCover = /^https?:\/\//.test(release.cover) ? release.cover : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "music.album" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(absoluteCover
          ? [
              { property: "og:image", content: absoluteCover },
              { name: "twitter:image", content: absoluteCover },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicAlbum",
            name: release.title,
            byArtist: { "@type": "MusicGroup", name: ARTIST.name },
            datePublished: release.date,
            ...(release.description ? { description: release.description } : {}),
            ...(absoluteCover ? { image: absoluteCover } : {}),
          }),
        },
      ],
    };
  },
  component: ReleasePage,
});

function ReleasePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(contentQueryOptions);
  const release = findRelease(data, slug);
  if (!release) throw notFound();

  return <ReleaseLanding release={release} content={data} />;
}

