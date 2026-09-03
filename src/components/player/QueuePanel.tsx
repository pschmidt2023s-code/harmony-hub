import { ListX, Play, Trash2, X } from "lucide-react";
import { usePlayer } from "./player-context";
import { formatTime } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Warteschlange des globalen Players (Phase 20).
 * Keine zweite Player-Instanz — nur eine Ansicht des bestehenden Zustands.
 */
export function QueuePanel() {
  const p = usePlayer();
  if (!p.queueOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-[var(--player-height,88px)] z-40 mx-auto max-h-[60dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl sm:right-4 sm:left-auto sm:mx-0">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Warteschlange</p>
          <p className="text-xs text-muted-foreground">
            {p.upNext.length === 0 ? "Keine weiteren Tracks" : `${p.upNext.length} Tracks als Nächstes`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={p.clearQueue}
            aria-label="Warteschlange leeren"
            className="grid min-h-11 min-w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListX className="size-4" />
          </button>
          <button
            onClick={() => p.setQueueOpen(false)}
            aria-label="Warteschlange schließen"
            className="grid min-h-11 min-w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ul className="max-h-[45dvh] overflow-y-auto p-2">
        {p.current && (
          <li className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2">
            <Play className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.current.title}</p>
              <p className="truncate text-xs text-muted-foreground">Läuft gerade</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{formatTime(p.current.duration)}</span>
          </li>
        )}
        {p.upNext.map((song) => (
          <li key={song.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/40">
            <button
              onClick={() => p.play(song, p.queue)}
              className="min-w-0 flex-1 text-left"
              aria-label={`${song.title} abspielen`}
            >
              <p className="truncate text-sm">{song.title}</p>
              <p className="truncate text-xs text-muted-foreground">{song.album}</p>
            </button>
            <span className={cn("text-xs tabular-nums text-muted-foreground")}>{formatTime(song.duration)}</span>
            <button
              onClick={() => p.removeFromQueue(song.id)}
              aria-label={`${song.title} aus der Warteschlange entfernen`}
              className="grid min-h-9 min-w-9 place-items-center text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {!p.current && p.upNext.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">Noch nichts in der Warteschlange.</li>
        )}
      </ul>
    </div>
  );
}
