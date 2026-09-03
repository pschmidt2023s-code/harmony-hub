import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { LatestMusic } from "@/components/home/LatestMusic";
import { UpcomingReleases } from "@/components/home/UpcomingReleases";
import { LatestVideos } from "@/components/home/LatestVideos";
import { TourDates } from "@/components/home/TourDates";
import { MerchHighlights } from "@/components/home/MerchHighlights";
import { NewsletterCta } from "@/components/home/NewsletterCta";
import { TOUR } from "@/lib/data";
import { shopCatalogQueryOptions, shopQueryOptions } from "@/lib/shop";
import { contentQueryOptions } from "@/lib/content";
import { jsonLd, musicGroupLd, seoHead, canonicalUrl, normalizeSettings } from "@/lib/seo";
import { newestRelease, songsByRecency, upcomingReleases, videosByRecency } from "@/lib/release";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [content] = await Promise.all([
      context.queryClient.ensureQueryData(contentQueryOptions),
      context.queryClient.ensureQueryData(shopCatalogQueryOptions),
    ]);
    return { settings: content.settings };
  },
  head: ({ loaderData }) => {
    const s = normalizeSettings(loaderData?.settings);
    const head = seoHead({
      title: s.site_title,
      description: s.site_description,
      path: "/",
      settings: s,
      type: "website",
    });
    const url = canonicalUrl("/", s.canonical_base_url);
    return {
      ...head,
      scripts: [
        jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: s.site_name, url }),
        jsonLd(musicGroupLd(s, url)),
      ],
    };
  },
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(contentQueryOptions);
  const { data: products } = useSuspenseQuery(shopQueryOptions);
  const release = newestRelease(data.releases);
  const upcoming = upcomingReleases(data.releases);
  // Das nächste angekündigte Release führt den Hero an, solange nichts Neues erschienen ist.
  const heroUpcoming = upcoming[0] ?? null;
  const songs = songsByRecency(data.songs, data.releases);

  return (
    <>
      <Hero release={release} upcoming={heroUpcoming} songs={data.songs} />
      <LatestMusic songs={songs} />
      <UpcomingReleases releases={upcoming.filter((r) => r.id !== heroUpcoming?.id)} />
      <LatestVideos videos={videosByRecency(data.videos)} />
      <TourDates dates={TOUR} />
      <MerchHighlights products={products} />
      <NewsletterCta />
    </>
  );
}
