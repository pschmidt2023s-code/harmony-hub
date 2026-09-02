import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ReleaseLanding } from "@/components/release/ReleaseLanding";
import { contentQueryOptions, type SiteContent } from "@/lib/content";
import { publishedReleases } from "@/lib/release";
import { formatDate, type Release } from "@/lib/data";
import { canonicalUrl, jsonLd, normalizeSettings, seoHead, socialImage } from "@/lib/seo";

const findRelease = (content: SiteContent | undefined, slug: string): Release | null =>
  content ? (publishedReleases(content.releases).find((r) => r.slug === slug) ?? null) : null;

export const Route = createFileRoute("/releases/$slug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: ({ params, loaderData }) => {
    const content = loaderData as SiteContent | undefined;
    const st = normalizeSettings(content?.settings);
    const release = findRelease(content, params.slug);
    const path = `/releases/${params.slug}`;
    if (!release) {
      // Entwürfe, geplante und archivierte Releases sind öffentlich nicht auffindbar.
      return seoHead({
        title: "Release nicht gefunden — TAYO",
        description: "Dieses Release ist nicht öffentlich verfügbar.",
        path,
        settings: st,
        noindex: true,
      });
    }
    const title = release.seoTitle?.trim() || `${release.artist || st.artist_name} — ${release.title}`;
    const description =
      release.seoDescription?.trim() ||
      release.shortDescription?.trim() ||
      release.description?.trim() ||
      `${release.type} von ${release.artist || st.artist_name}, erschienen am ${formatDate(release.date)}.`;
    const image = socialImage(release.cover, st.default_og_image);
    const head = seoHead({ title, description, path, settings: st, image: release.cover, type: "music.album" });
    return {
      ...head,
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: release.title,
          url: canonicalUrl(path, st.canonical_base_url),
          byArtist: { "@type": "MusicGroup", name: release.artist || st.artist_name },
          datePublished: release.date,
          numTracks: release.tracks,
          ...(release.description ? { description: release.description } : {}),
          ...(image ? { image } : {}),
        }),
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

