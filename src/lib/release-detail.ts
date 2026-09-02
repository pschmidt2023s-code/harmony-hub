import type { Product, Release, Song, Video } from "./data";

/** Tracks eines Releases in gespeicherter Reihenfolge. */
export function releaseTracks(songs: Song[], release: Release) {
  return songs.filter((s) => s.album === release.title);
}

export type StreamingService = { id: keyof Song["links"]; label: string; url: string };

const SERVICE_LABELS: { id: keyof Song["links"]; label: string }[] = [
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple Music" },
  { id: "youtube", label: "YouTube" },
  { id: "amazon", label: "Amazon Music" },
  { id: "deezer", label: "Deezer" },
];

/** Nur tatsächlich hinterlegte Streaming-Links, pro Dienst der erste Treffer. */
export function streamingServices(tracks: Song[], release?: Release): StreamingService[] {
  const out: StreamingService[] = [];
  const releaseLinks = release?.links ?? {};
  for (const { id, label } of SERVICE_LABELS) {
    const url =
      (typeof releaseLinks[id] === "string" && releaseLinks[id]!.trim() ? releaseLinks[id] : undefined) ??
      tracks.map((t) => t.links?.[id]).find((u) => typeof u === "string" && u.trim().length > 0);
    if (url) out.push({ id, label, url: url.trim() });
  }
  return out;
}

export type CreditGroup = { role: string; names: string[] };

/** Credits aus den gespeicherten Track-Feldern, ohne Duplikate. */
export function releaseCredits(tracks: Song[], release?: Release): CreditGroup[] {
  const manual = (release?.credits ?? []).filter((c) => c.role.trim() && c.names.trim());
  if (manual.length) {
    return manual.map((c) => ({
      role: c.role.trim(),
      names: c.names
        .split(/\s*,\s*/)
        .map((n) => n.trim())
        .filter(Boolean),
    }));
  }
  const collect = (pick: (s: Song) => string | null | undefined) => {
    const set = new Set<string>();
    for (const t of tracks) {
      for (const part of (pick(t) ?? "").split(/\s*[,&/]\s*/)) {
        const name = part.trim();
        if (name) set.add(name);
      }
    }
    return [...set];
  };
  return [
    { role: "Songwriting", names: collect((s) => s.songwriter) },
    { role: "Produktion", names: collect((s) => s.producer) },
  ].filter((g) => g.names.length > 0);
}

/** Genres der enthaltenen Tracks. */
export function releaseGenres(tracks: Song[]) {
  return [...new Set(tracks.map((t) => t.genre).filter(Boolean))];
}

/** Videos, die zu diesem Release oder einem seiner Tracks gehören. */
export function releaseVideos(videos: Video[], release: Release, tracks: Song[]) {
  if (release.videoId) {
    const linked = videos.find((v) => v.id === release.videoId);
    if (linked) return [linked];
  }
  const titles = new Set([release.title.toLowerCase(), ...tracks.map((t) => t.title.toLowerCase())]);
  return videos.filter((v) => titles.has((v.song ?? "").toLowerCase()));
}

/** Merch, dessen Name auf das Release oder einen Track verweist. */
export function releaseProducts(products: Product[], release: Release, tracks: Song[]) {
  const terms = [release.title, ...tracks.map((t) => t.title)].map((t) => t.toLowerCase());
  return products.filter((p) => terms.some((t) => p.name.toLowerCase().includes(t)));
}

/** Gesamtlaufzeit der Tracks in Sekunden (0, wenn keine Tracks). */
export function totalDuration(tracks: Song[]) {
  return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
}

export const releaseHref = (release: Release) => `/releases/${release.slug}`;
