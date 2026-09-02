import type { Release, Song, Video } from "./data";

const today = () => new Date().toISOString().slice(0, 10);

/** URL-tauglicher Slug aus dem Release-Titel. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Öffentlich sichtbar: bereits erschienen. */
export function publishedReleases(releases: Release[]) {
  return releases.filter((r) => r.isPublic).sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Neuestes veröffentlichtes Release oder null. */
export function newestRelease(releases: Release[]): Release | null {
  return publishedReleases(releases)[0] ?? null;
}

/** Öffentlich angekündigte, noch nicht erschienene Releases (keine Entwürfe). */
export function upcomingReleases(releases: Release[]) {
  const t = today();
  return releases
    .filter(
      (r) =>
        !r.isPublic &&
        r.date > t &&
        (r.status === "Geplant" || r.status === "Vorbestellung" || r.status === "Veröffentlicht"),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Tage bis zum Release (>= 0) oder null, wenn das Datum erreicht ist. */
export function daysUntil(date: string) {
  const diff = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`);
  const days = Math.round(diff / 86_400_000);
  return days > 0 ? days : null;
}

/**
 * Songs nach Aktualität sortieren: erst die Tracks des neuesten Releases,
 * danach die übrigen anhand des tatsächlichen Release-Datums ihres Albums.
 */
export function songsByRecency(songs: Song[], releases: Release[]) {
  const dateByAlbum = new Map(releases.map((r) => [r.title, r.date]));
  const newestTitle = newestRelease(releases)?.title;
  return [...songs].sort((a, b) => {
    const aNew = a.album === newestTitle ? 1 : 0;
    const bNew = b.album === newestTitle ? 1 : 0;
    if (aNew !== bNew) return bNew - aNew;
    const aDate = dateByAlbum.get(a.album) ?? "";
    const bDate = dateByAlbum.get(b.album) ?? "";
    if (aDate !== bDate) return aDate < bDate ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

/** Videos nach Datum, neuestes zuerst. */
export function videosByRecency(videos: Video[]) {
  return [...videos].sort((a, b) => (a.date < b.date ? 1 : -1));
}
