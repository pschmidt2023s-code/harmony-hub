import {
  Heart,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { usePlayer } from "./player-context";
import { formatTime } from "@/lib/data";
import { cn } from "@/lib/utils";

function Waveform({ progress }: { progress: number }) {
  const bars = 64;
  return (
    <div className="flex h-8 w-full items-center gap-[2px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const height = 20 + Math.abs(Math.sin(i * 0.6)) * 70 + ((i * 13) % 20);
        const active = i / bars <= progress;
        return (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              active ? "bg-primary" : "bg-foreground/15",
            )}
            style={{ height: `${Math.min(100, height)}%` }}
          />
        );
      })}
    </div>
  );
}

export function PlayerBar() {
  const p = usePlayer();
  if (!p.current) return null;
  const song = p.current;
  const ratio = p.progress / song.duration;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 transition-all duration-500",
        p.expanded ? "top-0" : "top-auto",
      )}
    >
      <div
        className={cn(
          "glass-strong mx-auto flex flex-col shadow-[var(--shadow-elevated)]",
          p.expanded
            ? "h-full rounded-none px-6 py-10"
            : "mb-3 max-w-6xl rounded-2xl px-4 py-3 sm:mb-4 sm:px-5",
        )}
        style={
          p.expanded
            ? { backgroundImage: `radial-gradient(120% 80% at 50% 0%, oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 18%), transparent 70%)` }
            : undefined
        }
      >
        {p.expanded && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8">
            <img
              src={song.cover}
              alt={`Cover von ${song.title}`}
              width={800}
              height={800}
              loading="lazy"
              className="w-64 rounded-3xl shadow-[var(--shadow-glow)] sm:w-80"
            />
            <div className="text-center">
              <h2 className="text-3xl font-semibold sm:text-4xl">{song.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {song.album} · {song.bpm} BPM · {song.key}
              </p>
            </div>
            <div className="w-full space-y-2 text-center text-sm text-muted-foreground">
              {song.lyrics.map((l) => (
                <p
                  key={l.time}
                  className={cn(
                    "transition-all duration-500",
                    p.progress >= l.time ? "text-foreground" : "opacity-40",
                  )}
                >
                  {l.line}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-3">
            {!p.expanded && (
              <img
                src={song.cover}
                alt=""
                width={800}
                height={800}
                loading="lazy"
                className="size-11 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{song.title}</p>
              <p className="truncate text-xs text-muted-foreground">{song.album}</p>
            </div>
            <button
              onClick={() => p.toggleFavorite(song.id)}
              aria-label="Zu Favoriten"
              className="ml-1 hidden shrink-0 text-muted-foreground transition-colors hover:text-primary sm:block"
            >
              <Heart className={cn("size-4", p.favorites.includes(song.id) && "fill-primary text-primary")} />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={p.toggleShuffle}
              aria-label="Shuffle"
              className={cn("hidden p-2 text-muted-foreground transition-colors hover:text-foreground sm:block", p.shuffle && "text-primary")}
            >
              <Shuffle className="size-4" />
            </button>
            <button onClick={p.prev} aria-label="Vorheriger Track" className="p-2 transition-transform hover:scale-110">
              <SkipBack className="size-5" />
            </button>
            <button
              onClick={p.toggle}
              aria-label={p.playing ? "Pause" : "Play"}
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
            >
              {p.playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-[1px]" />}
            </button>
            <button onClick={p.next} aria-label="Nächster Track" className="p-2 transition-transform hover:scale-110">
              <SkipForward className="size-5" />
            </button>
            <button
              onClick={p.toggleRepeat}
              aria-label="Repeat"
              className={cn("hidden p-2 text-muted-foreground transition-colors hover:text-foreground sm:block", p.repeat && "text-primary")}
            >
              <Repeat className="size-4" />
            </button>
          </div>

          <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {formatTime(p.progress)}
            </span>
            <button
              className="flex-1"
              aria-label="Position wählen"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                p.seek(((e.clientX - rect.left) / rect.width) * song.duration);
              }}
            >
              <Waveform progress={ratio} />
            </button>
            <span className="w-9 text-[11px] tabular-nums text-muted-foreground">
              {formatTime(song.duration)}
            </span>
            <div className="hidden items-center gap-2 lg:flex">
              <Volume2 className="size-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={p.volume}
                onChange={(e) => p.setVolume(Number(e.target.value))}
                aria-label="Lautstärke"
                className="h-1 w-20 accent-[var(--primary)]"
              />
            </div>
            <button className="hidden p-1 text-muted-foreground hover:text-foreground xl:block" aria-label="Queue">
              <ListMusic className="size-4" />
            </button>
            <button
              onClick={() => p.setExpanded(!p.expanded)}
              aria-label={p.expanded ? "Player verkleinern" : "Player vergrößern"}
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {p.expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}