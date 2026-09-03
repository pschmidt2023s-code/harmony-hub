import { useState } from "react";
import { ChevronDown, Heart, ListPlus, Lock, Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/player/player-context";
import { formatTime, type Song } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Premium-Tracklist: Nummer, Titel, Dauer, Play – Wiedergabe über den globalen Player. */
export function Tracklist({ tracks, locked = false }: { tracks: Song[]; locked?: boolean }) {
  const p = usePlayer();
  const [openLyrics, setOpenLyrics] = useState<string | null>(null);

  return (
    <ol className="glass overflow-hidden rounded-2xl">
      {tracks.map((song, i) => {
        const active = p.current?.id === song.id;
        const isPlaying = active && p.playing;
        const lyrics = song.lyrics ?? [];
        const credits = song.credits ?? [];
        // Gesperrt: Release noch nicht erschienen ODER exklusiver Track ohne Freigabe.
        const isLocked = locked || song.locked;
        const open = openLyrics === song.id;

        return (
          <li
            key={song.id}
            className={cn(
              "border-b border-border/40 last:border-b-0 transition-colors",
              active && "bg-primary/10",
            )}
          >
            <div className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
              <button
                onClick={() => (isLocked ? undefined : active ? p.toggle() : p.play(song, tracks.filter((t) => !t.locked)))}
                disabled={isLocked}
                aria-label={
                  isLocked
                    ? `${song.title} ist noch nicht verfügbar`
                    : isPlaying
                      ? `${song.title} pausieren`
                      : `${song.title} abspielen`
                }
                className={cn(
                  "grid size-10 place-items-center rounded-full text-xs tabular-nums transition-colors sm:size-9",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {isLocked ? (
                  <Lock className="size-3.5" />
                ) : isPlaying ? (
                  <Pause className="size-3.5" />
                ) : active ? (
                  <Play className="size-3.5" />
                ) : (
                  <>
                    <span className="group-hover:hidden">{String(i + 1).padStart(2, "0")}</span>
                    <Play className="hidden size-3.5 group-hover:block" />
                  </>
                )}
              </button>

              <div className="min-w-0">
                <p className={cn("truncate text-sm font-medium sm:text-base", active && "text-primary")}>
                  {song.title}
                  {song.explicit && (
                    <span className="ml-2 rounded bg-muted px-1 text-[10px] align-middle text-muted-foreground">
                      E
                    </span>
                  )}
                </p>
                {lyrics.length > 0 && (
                  <button
                    onClick={() => setOpenLyrics(open ? null : song.id)}
                    aria-expanded={open}
                    className="-ml-1 mt-0.5 inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Lyrics
                    <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {!isLocked && (
                  <button
                    onClick={() => p.addToQueue(song)}
                    aria-label={`${song.title} zur Warteschlange hinzufügen`}
                    className="hidden min-h-11 min-w-11 place-items-center text-muted-foreground transition-colors hover:text-primary sm:grid"
                  >
                    <ListPlus className="size-4" />
                  </button>
                )}
                <button
                  onClick={() => p.toggleFavorite(song.id)}
                  aria-label={`${song.title} zu Favoriten`}
                  className="hidden min-h-11 min-w-11 place-items-center sm:grid"
                >
                  <Heart
                    className={cn(
                      "size-4 text-muted-foreground transition-colors hover:text-primary",
                      p.favorites.includes(song.id) && "fill-primary text-primary",
                    )}
                  />
                </button>
                {song.duration > 0 && (
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {formatTime(song.duration)}
                  </span>
                )}
              </div>
            </div>

            {open && lyrics.length > 0 && (
              <div className="animate-fade-in border-t border-border/40 px-5 py-4 sm:px-14">
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {lyrics.map((l) => l.line).join("\n")}
                </p>
                {credits.length > 0 && (
                  <dl className="mt-4 grid gap-1 border-t border-border/40 pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                    {credits.map((c) => (
                      <div key={`${c.role}-${c.names}`} className="flex gap-2">
                        <dt className="font-medium text-foreground">{c.role}</dt>
                        <dd>{c.names}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
