import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { type Song } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { supabase } from "@/integrations/supabase/client";

type PlayerState = {
  queue: Song[];
  current: Song | null;
  index: number;
  playing: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  expanded: boolean;
  favorites: string[];
  play: (song: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (value: boolean) => void;
  toggleFavorite: (id: string) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { data: content } = useQuery(contentQueryOptions);
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const current = started ? (queue[index] ?? null) : null;

  // Standard-Queue mit der Diskografie aus der Datenbank füllen.
  useEffect(() => {
    if (!started && content?.songs.length) setQueue(content.songs);
  }, [content, started]);

  const next = useCallback(() => {
    setProgress(0);
    setIndex((i) => {
      if (!queue.length) return i;
      if (shuffle) return Math.floor(Math.random() * queue.length);
      return (i + 1) % queue.length;
    });
  }, [queue.length, shuffle]);

  const prev = useCallback(() => {
    setProgress(0);
    setIndex((i) => (queue.length ? (i - 1 + queue.length) % queue.length : i));
  }, [queue.length]);

  useEffect(() => {
    if (!playing || !current) return;
    timer.current = window.setInterval(() => {
      setProgress((p) => {
        if (p + 0.25 >= current.duration) {
          if (repeat) return 0;
          window.setTimeout(next, 0);
          return 0;
        }
        return p + 0.25;
      });
    }, 250);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, current, repeat, next]);

  // Favoriten aus dem Fan-Account laden und bei Login/Logout synchron halten.
  useEffect(() => {
    const load = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) {
        setFavorites([]);
        return;
      }
      const { data } = await supabase.from("favorites").select("song_id").eq("user_id", uid);
      setFavorites((data ?? []).map((f) => f.song_id));
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void load(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
      if (!userId) return;
      void (async () => {
        const isFav = favorites.includes(id);
        if (isFav) {
          await supabase.from("favorites").delete().eq("user_id", userId).eq("song_id", id);
        } else {
          await supabase.from("favorites").insert({ user_id: userId, song_id: id });
        }
      })();
    },
    [favorites, userId],
  );

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      current,
      index,
      playing,
      progress,
      volume,
      shuffle,
      repeat,
      expanded,
      favorites,
      play: (song, nextQueue) => {
        const list = nextQueue ?? queue;
        const i = Math.max(0, list.findIndex((s) => s.id === song.id));
        setQueue(list);
        setIndex(i);
        setStarted(true);
        setProgress(0);
        setPlaying(true);
      },
      toggle: () => {
        setStarted(true);
        setPlaying((p) => !p);
      },
      next,
      prev,
      seek: setProgress,
      setVolume,
      toggleShuffle: () => setShuffle((s) => !s),
      toggleRepeat: () => setRepeat((r) => !r),
      setExpanded,
      toggleFavorite,
    }),
    [queue, current, index, playing, progress, volume, shuffle, repeat, expanded, favorites, next, prev, toggleFavorite],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}