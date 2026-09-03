import { useCallback, useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getLibrary } from "./library.functions";
import { contentQueryOptions } from "./content";
import type { Song } from "./data";

/**
 * Phase 20 — zentrale Music Library.
 *
 * Eine einzige Quelle für Favoriten, "Zuletzt gehört" und "Weiterhören".
 * Angemeldete Fans: Datenbank (RLS-geschützt). Gäste: lokaler Browser-Speicher,
 * damit ohne Account keine Daten auf dem Server landen.
 */

export type PlayEntry = { songId: string; playedAt: string };
export type PositionEntry = { songId: string; position: number; duration: number; updatedAt: string };

const RECENT_KEY = "tayo:recently-played";
const POSITION_KEY = "tayo:playback-positions";
const EVENT = "tayo:library-changed";
const MAX_RECENT = 30;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt — Gastdaten sind bewusst optional. */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const guestLibrary = {
  recent: () => read<PlayEntry[]>(RECENT_KEY, []),
  positions: () => read<PositionEntry[]>(POSITION_KEY, []),
  addPlay(songId: string) {
    const next = [{ songId, playedAt: new Date().toISOString() }, ...read<PlayEntry[]>(RECENT_KEY, [])].slice(
      0,
      MAX_RECENT,
    );
    write(RECENT_KEY, next);
  },
  savePosition(songId: string, position: number, duration: number) {
    const rest = read<PositionEntry[]>(POSITION_KEY, []).filter((p) => p.songId !== songId);
    const finished = duration > 0 && position >= duration * 0.97;
    if (finished || position < 15) {
      write(POSITION_KEY, rest);
      return;
    }
    write(POSITION_KEY, [
      { songId, position: Math.round(position), duration: Math.round(duration), updatedAt: new Date().toISOString() },
      ...rest,
    ]);
  },
};

/** Änderungen an der Gast-Library melden (localStorage feuert im selben Tab nicht). */
export function notifyLibraryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export const libraryQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["music-library", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => getLibrary(),
  });

export type LibraryView = {
  signedIn: boolean;
  songs: Song[];
  favorites: Song[];
  recentlyPlayed: Song[];
  continueListening: { song: Song; position: number }[];
  isEmpty: boolean;
};

/**
 * Aufbereitete Library. Es werden ausschließlich Songs angezeigt, die aktuell
 * tatsächlich öffentlich verfügbar sind — keine gesperrten oder gelöschten IDs.
 */
export function useMusicLibrary(userId: string | null, favoriteIds: string[]): LibraryView {
  const { data: content } = useQuery(contentQueryOptions);
  const { data: remote } = useQuery(libraryQueryOptions(userId));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const guest = useMemo(() => {
    void tick;
    if (userId) return null;
    return { recent: guestLibrary.recent(), positions: guestLibrary.positions() };
  }, [userId, tick]);

  return useMemo(() => {
    const songs = (content?.songs ?? []).filter((s) => !s.locked);
    const byId = new Map(songs.map((s) => [s.id, s] as const));

    const recentIds = userId
      ? (remote?.history ?? []).map((h) => h.song_id)
      : (guest?.recent ?? []).map((h) => h.songId);
    const seen = new Set<string>();
    const recentlyPlayed: Song[] = [];
    for (const id of recentIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const song = byId.get(id);
      if (song) recentlyPlayed.push(song);
      if (recentlyPlayed.length >= 12) break;
    }

    const positions = userId
      ? (remote?.positions ?? []).map((p) => ({
          songId: p.song_id,
          position: Number(p.position_seconds),
          updatedAt: p.updated_at,
        }))
      : (guest?.positions ?? []).map((p) => ({ songId: p.songId, position: p.position, updatedAt: p.updatedAt }));

    const continueListening = positions
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map((p) => ({ song: byId.get(p.songId), position: p.position }))
      .filter((x): x is { song: Song; position: number } => Boolean(x.song))
      .slice(0, 8);

    const favorites = favoriteIds.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s));

    return {
      signedIn: Boolean(userId),
      songs,
      favorites,
      recentlyPlayed,
      continueListening,
      isEmpty: favorites.length === 0 && recentlyPlayed.length === 0 && continueListening.length === 0,
    };
  }, [content, remote, guest, favoriteIds, userId]);
}

/** Kurzform für Komponenten, die nur die reine Anzeige brauchen. */
export const useLibraryRefreshSignal = () => useCallback(notifyLibraryChanged, []);
