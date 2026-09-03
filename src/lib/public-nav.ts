import { useQuery } from "@tanstack/react-query";
import { contentQueryOptions } from "@/lib/content";
import { shopQueryOptions } from "@/lib/shop";
import { TOUR } from "@/lib/data";
import { publishedReleases } from "@/lib/release";

/**
 * Phase 17 — Low Profile.
 *
 * Öffentliche Navigation und Sektionen richten sich ausschließlich nach dem
 * tatsächlich veröffentlichten Content. Es gibt bewusst KEINEN Low-Profile-
 * Schalter: sobald echte Videos, Produkte oder Tourdaten gepflegt sind,
 * erscheinen die zugehörigen Bereiche automatisch wieder.
 */
export type PublicSections = {
  hasMusic: boolean;
  hasVideos: boolean;
  hasShop: boolean;
  hasTour: boolean;
};

/** Kommende (heute oder später) Live-Termine aus der bestehenden Tour-Datenquelle. */
export function upcomingTourDates() {
  const today = new Date().toISOString().slice(0, 10);
  return TOUR.filter((t) => t.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function usePublicSections(): PublicSections {
  const { data: content } = useQuery(contentQueryOptions);
  const { data: products } = useQuery(shopQueryOptions);

  return {
    hasMusic: Boolean(content && (content.songs.length > 0 || publishedReleases(content.releases).length > 0)),
    hasVideos: Boolean(content && content.videos.length > 0),
    hasShop: Boolean(products && products.length > 0),
    hasTour: upcomingTourDates().length > 0,
  };
}
