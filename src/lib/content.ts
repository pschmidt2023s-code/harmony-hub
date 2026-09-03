import { queryOptions } from "@tanstack/react-query";
import coverMidnight from "@/assets/cover-midnight.jpg";
import coverNeon from "@/assets/cover-neon.jpg";
import coverSmoke from "@/assets/cover-smoke.jpg";
import { getContent } from "./content.functions";
import type { Release, Song, Video } from "./data";
import { normalizeSettings, type PublicSiteSettings } from "./seo";

const COVERS: Record<string, string> = {
  midnight: coverMidnight,
  neon: coverNeon,
  smoke: coverSmoke,
};

const cover = (key: string) => COVERS[key] ?? coverMidnight;

export type SiteContent = {
  songs: Song[];
  /** Release-Day-Locked Tracks: sichtbar, aber ohne Audio (Phase 20). */
  lockedSongs: Song[];
  releases: Release[];
  videos: Video[];
  settings: PublicSiteSettings;
};

export const contentQueryOptions = queryOptions({
  queryKey: ["site-content"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<SiteContent> => {
    const data = await getContent();
    const releaseCover = new Map(
      data.releases.map((r) => [r.id, r.cover_url || cover(r.cover_key)] as const),
    );
    type Row = (typeof data)["songs"][number] | (typeof data)["lockedSongs"][number];
    const toSong = (s: Row): Song => ({
      id: s.id,
      slug: s.slug || s.id,
      title: s.title,
      artist: s.artist || "TAYO",
      album: s.album,
      releaseId: s.release_id,
      type: s.type as Song["type"],
      // Fallback-Kette: Song-Artwork → Release-Artwork → lokales Asset
      cover: s.cover_url || (s.release_id ? releaseCover.get(s.release_id) : undefined) || cover(s.cover_key),
      audio: s.audio_url,
      duration: s.duration,
      description: s.description ?? "",
      language: s.language ?? "",
      genre: s.genre,
      bpm: s.bpm,
      key: s.song_key,
      mood: s.mood,
      songwriter: s.songwriter,
      producer: s.producer,
      isrc: s.isrc,
      explicit: s.explicit,
      links: s.links as unknown as Song["links"],
      lyrics: (s.lyrics ?? []) as unknown as Song["lyrics"],
      credits: (s.credits ?? []) as unknown as Song["credits"],
      accessLevel: (s.access_level ?? "PUBLIC") === "EXCLUSIVE" ? "EXCLUSIVE" : "PUBLIC",
      locked: Boolean(s.locked),
    });

    return {
      settings: normalizeSettings(data.settings),
      songs: data.songs.map(toSong),
      lockedSongs: data.lockedSongs.map(toSong),


      releases: data.releases.map((r) => ({
        id: r.id,
        slug: r.slug || r.id,
        title: r.title,
        artist: r.artist || "TAYO",
        type: r.type as Release["type"],
        cover: r.cover_url || cover(r.cover_key),
        date: r.release_date,
        publishAt: r.publish_at,
        status: r.status as Release["status"],
        description: r.description,
        shortDescription: r.short_description ?? "",
        explicit: Boolean(r.explicit),
        links: (r.links ?? {}) as Record<string, string>,
        credits: (r.credits ?? []) as Release["credits"],
        videoId: r.video_id,
        seoTitle: r.seo_title ?? "",
        seoDescription: r.seo_description ?? "",
        tracks: r.tracks,
        isPublic: r.is_public,
        updatedAt: r.updated_at,
      })),
      videos: data.videos.map((v) => ({
        id: v.id,
        slug: v.slug || v.id,
        title: v.title,
        category: v.category as Video["category"],
        thumb: v.thumb_url || cover(v.thumb_key),
        date: v.video_date,
        views: v.views,
        song: v.song,
        description: v.description ?? "",
        source: v.source ?? "upload",
        url: v.video_url,
        releaseId: v.release_id,
        songId: v.song_id,
        seoTitle: v.seo_title ?? "",
        seoDescription: v.seo_description ?? "",
      })),
    };
  },
});
