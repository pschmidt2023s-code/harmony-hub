import { Heart, Play } from "lucide-react";
import { usePlayer } from "./player/player-context";
import { formatTime, type Song } from "@/lib/data";
import { cn } from "@/lib/utils";

export function SongRow({ song, list, index }: { song: Song; list: Song[]; index: number }) {
  const p = usePlayer();
  const active = p.current?.id === song.id;

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/60 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]",
        active && "bg-secondary/80",
      )}
    >
      <button
        onClick={() => p.play(song, list)}
        aria-label={`${song.title} abspielen`}
        className="relative size-12 shrink-0 overflow-hidden rounded-lg"
      >
        <img src={song.cover} alt="" width={800} height={800} loading="lazy" className="size-full object-cover" />
        <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="size-4 text-primary" />
        </span>
      </button>
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-medium", active && "text-primary")}>
          {song.title}
          {song.explicit && (
            <span className="ml-2 rounded bg-muted px-1 text-[10px] text-muted-foreground">E</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {song.album} · {song.genre}
        </p>
      </div>
      <p className="hidden text-xs text-muted-foreground sm:block">{song.bpm} BPM</p>
      <p className="hidden text-xs text-muted-foreground sm:block">{song.key}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => p.toggleFavorite(song.id)} aria-label="Favorit">
          <Heart
            className={cn(
              "size-4 text-muted-foreground transition-colors hover:text-primary",
              p.favorites.includes(song.id) && "fill-primary text-primary",
            )}
          />
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(song.duration)}
        </span>
      </div>
      <span className="sr-only">{index + 1}</span>
    </div>
  );
}