import { queryOptions } from "@tanstack/react-query";
import coverMidnight from "@/assets/cover-midnight.jpg";
import coverNeon from "@/assets/cover-neon.jpg";
import coverSmoke from "@/assets/cover-smoke.jpg";
import { getContent } from "./content.functions";
import type { Release, Song, Video } from "./data";

const COVERS: Record<string, string> = {
  midnight: coverMidnight,
  neon: coverNeon,
  smoke: coverSmoke,
};

const cover = (key: string) => COVERS[key] ?? coverMidnight;

export type SiteContent = { songs: Song[]; releases: Release[]; videos: Video[] };

export const contentQueryOptions = queryOptions({
  queryKey: ["site-content"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<SiteContent> => {
    const data = await getContent();
    return {
      songs: data.songs.map((s) => ({
        id: s.id,
        title: s.title,
        album: s.album,
        type: s.type as Song["type"],
        cover: cover(s.cover_key),
        duration: s.duration,
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
      })),
      releases: data.releases.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type as Release["type"],
        cover: cover(r.cover_key),
        date: r.release_date,
        status: r.status as Release["status"],
        description: r.description,
        tracks: r.tracks,
      })),
      videos: data.videos.map((v) => ({
        id: v.id,
        title: v.title,
        category: v.category as Video["category"],
        thumb: cover(v.thumb_key),
        date: v.video_date,
        views: v.views,
        song: v.song,
      })),
    };
  },
});
