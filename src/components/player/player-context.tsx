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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Song } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { supabase } from "@/integrations/supabase/client";
import { guestLibrary, notifyLibraryChanged } from "@/lib/library";
import { recordPlay, savePlaybackPosition } from "@/lib/library.functions";

export type RepeatMode = "off" | "track" | "queue";

type PlayerState = {
  queue: Song[];
  current: Song | null;
  index: number;
  playing: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  queueOpen: boolean;
  favorites: string[];
  userId: string | null;
  /** Kommende Tracks der aktuellen Warteschlange. */
  upNext: Song[];
  play: (song: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setExpanded: (value: boolean) => void;
  setQueueOpen: (value: boolean) => void;
  toggleFavorite: (id: string) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  /** Ist dieser Track abspielbar (nicht gesperrt)? */
  canPlay: (song: Song) => boolean;
};

const PlayerContext = createContext<PlayerState | null>(null);

/** Gesperrte Tracks (exklusiv oder Release-Day-Locked) gelangen nie in die Queue. */
const playable = (s: Song) => !s.locked;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { data: content } = useQuery(contentQueryOptions);
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  // Shuffle-Zyklus: bereits gespielte Positionen, damit kein Track doppelt kommt.
  const playedCycle = useRef<Set<string>>(new Set());
  const history = useRef<number[]>([]);
  const progressRef = useRef(0);
  const currentRef = useRef<Song | null>(null);
  const userRef = useRef<string | null>(null);

  const current = started ? (queue[index] ?? null) : null;
  progressRef.current = progress;
  userRef.current = userId;

  // Standard-Queue mit der verfügbaren Diskografie füllen (nur abspielbare Tracks).
  useEffect(() => {
    if (!started && content?.songs.length) setQueue(content.songs.filter(playable));
  }, [content, started]);

  const advance = useCallback(
    (auto: boolean) => {
      setProgress(0);
      setIndex((i) => {
        if (!queue.length) return i;
        if (auto && repeat === "track") return i;
        history.current.push(i);
        if (shuffle) {
          const cycle = playedCycle.current;
          cycle.add(queue[i]?.id ?? "");
          let pool = queue.map((s, n) => ({ s, n })).filter(({ s, n }) => n !== i && !cycle.has(s.id));
          if (!pool.length) {
            cycle.clear();
            pool = queue.map((s, n) => ({ s, n })).filter(({ n }) => n !== i);
          }
          if (!pool.length) return i;
          return pool[Math.floor(Math.random() * pool.length)]!.n;
        }
        const nextIndex = i + 1;
        if (nextIndex >= queue.length) {
          if (repeat === "queue" || !auto) return 0;
          setPlaying(false);
          return i;
        }
        return nextIndex;
      });
    },
    [queue, shuffle, repeat],
  );

  const next = useCallback(() => advance(false), [advance]);

  const prev = useCallback(() => {
    setProgress(0);
    // Innerhalb der ersten Sekunden zum vorherigen Track, sonst an den Anfang.
    if (progressRef.current > 5) return;
    setIndex((i) => {
      const back = history.current.pop();
      if (typeof back === "number") return back;
      return queue.length ? (i - 1 + queue.length) % queue.length : i;
    });
  }, [queue.length]);

  useEffect(() => {
    if (!playing || !current) return;
    timer.current = window.setInterval(() => {
      setProgress((p) => {
        if (p + 0.25 >= current.duration) {
          if (repeat === "track") return 0;
          window.setTimeout(() => advance(true), 0);
          return 0;
        }
        return p + 0.25;
      });
    }, 250);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, current, repeat, advance]);

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

  /** Wiedergabeposition des vorherigen Tracks sichern (Weiterhören). */
  const persistPosition = useCallback(
    (song: Song | null, position: number) => {
      if (!song || song.duration <= 0) return;
      if (userRef.current) {
        void savePlaybackPosition({ data: { songId: song.id, position, duration: song.duration } })
          .then(() => queryClient.invalidateQueries({ queryKey: ["music-library"] }))
          .catch(() => undefined);
      } else {
        guestLibrary.savePosition(song.id, position, song.duration);
      }
    },
    [queryClient],
  );

  // Trackwechsel: Historie protokollieren und Position des vorherigen Tracks sichern.
  useEffect(() => {
    const previous = currentRef.current;
    if (previous && previous.id !== current?.id) persistPosition(previous, progressRef.current);
    currentRef.current = current;
    if (!current) return;
    if (userRef.current) {
      void recordPlay({ data: { songId: current.id } })
        .then(() => queryClient.invalidateQueries({ queryKey: ["music-library"] }))
        .catch(() => undefined);
    } else {
      guestLibrary.addPlay(current.id);
    }
    notifyLibraryChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Position regelmäßig und beim Verlassen der Seite sichern.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => persistPosition(currentRef.current, progressRef.current), 15_000);
    const onLeave = () => persistPosition(currentRef.current, progressRef.current);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [playing, persistPosition]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!userId) return;
      const isFav = favorites.includes(id);
      setFavorites((f) => (isFav ? f.filter((x) => x !== id) : [...f, id]));
      void (async () => {
        if (isFav) {
          await supabase.from("favorites").delete().eq("user_id", userId).eq("song_id", id);
        } else {
          await supabase.from("favorites").insert({ user_id: userId, song_id: id });
        }
        void queryClient.invalidateQueries({ queryKey: ["music-library"] });
      })();
    },
    [favorites, userId, queryClient],
  );

  const upNext = useMemo(() => (started ? queue.slice(index + 1) : []), [queue, index, started]);

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
      queueOpen,
      favorites,
      userId,
      upNext,
      canPlay: playable,
      play: (song, nextQueue) => {
        if (!playable(song)) return;
        const list = (nextQueue ?? queue).filter(playable);
        const i = Math.max(0, list.findIndex((s) => s.id === song.id));
        playedCycle.current = new Set();
        history.current = [];
        setQueue(list.length ? list : [song]);
        setIndex(i);
        setStarted(true);
        setProgress(0);
        setPlaying(true);
      },
      toggle: () => {
        if (!current && !queue.length) return;
        setStarted(true);
        setPlaying((p) => !p);
      },
      next,
      prev,
      seek: setProgress,
      setVolume,
      toggleShuffle: () =>
        setShuffle((s) => {
          playedCycle.current = new Set();
          return !s;
        }),
      cycleRepeat: () => setRepeat((r) => (r === "off" ? "track" : r === "track" ? "queue" : "off")),
      setExpanded,
      setQueueOpen,
      toggleFavorite,
      playNext: (song) => {
        if (!playable(song)) return;
        setQueue((q) => {
          const without = q.filter((s) => s.id !== song.id);
          const at = started ? Math.min(index + 1, without.length) : 0;
          return [...without.slice(0, at), song, ...without.slice(at)];
        });
      },
      addToQueue: (song) => {
        if (!playable(song)) return;
        setQueue((q) => (q.some((s) => s.id === song.id) ? q : [...q, song]));
      },
      removeFromQueue: (id) => {
        setQueue((q) => {
          const at = q.findIndex((s) => s.id === id);
          if (at < 0 || (started && at === index)) return q;
          if (started && at < index) setIndex((i) => i - 1);
          return q.filter((s) => s.id !== id);
        });
      },
      clearQueue: () => {
        setQueue((q) => (current ? [current] : q.slice(0, 0)));
        setIndex(0);
        history.current = [];
        playedCycle.current = new Set();
      },
    }),
    [
      queue,
      current,
      index,
      playing,
      progress,
      volume,
      shuffle,
      repeat,
      expanded,
      queueOpen,
      favorites,
      userId,
      upNext,
      started,
      next,
      prev,
      toggleFavorite,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
