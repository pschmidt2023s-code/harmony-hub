import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { LatestMusic } from "@/components/home/LatestMusic";
import { UpcomingReleases } from "@/components/home/UpcomingReleases";
import { LatestVideos } from "@/components/home/LatestVideos";
import { TourDates } from "@/components/home/TourDates";
import { MerchHighlights } from "@/components/home/MerchHighlights";
import { NewsletterCta } from "@/components/home/NewsletterCta";
import { PRODUCTS, TOUR } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { newestRelease, songsByRecency, upcomingReleases, videosByRecency } from "@/lib/release";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQueryOptions),
  head: () => ({
    meta: [
      { title: "TAYO — Musik, Releases & Merch" },
      {
        name: "description",
        content:
          "Offizielle Plattform von TAYO: aktuelle Releases, Musikvideos, Tourdaten und limitiertes Merch.",
      },
      { property: "og:title", content: "TAYO — Musik, Releases & Merch" },
      {
        property: "og:description",
        content: "Aktuelle Releases, Musikvideos, Tourdaten und limitiertes Merch von TAYO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(contentQueryOptions);
  const release = newestRelease(data.releases);
  const songs = songsByRecency(data.songs, data.releases);

  return (
    <>
      <Hero release={release} songs={songs} />
      <LatestMusic songs={songs} />
      <UpcomingReleases releases={upcomingReleases(data.releases)} />
      <LatestVideos videos={videosByRecency(data.videos)} />
      <TourDates dates={TOUR} />
      <MerchHighlights products={PRODUCTS} />
      <NewsletterCta />
    </>
  );
}
