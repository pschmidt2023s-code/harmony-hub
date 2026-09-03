import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: number): Parts | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * Live-Countdown bis zum Release. Startet bewusst erst nach der Hydration,
 * damit Server- und Client-HTML identisch bleiben.
 */
export function Countdown({ date, className }: { date: string; className?: string }) {
  const target = Date.parse(`${date}T00:00:00Z`);
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(partsUntil(target));
    const id = window.setInterval(() => setParts(partsUntil(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!parts) return null;

  const cells: [number, string][] = [
    [parts.days, "Tage"],
    [parts.hours, "Std"],
    [parts.minutes, "Min"],
    [parts.seconds, "Sek"],
  ];

  return (
    <div className={className}>
      <div className="flex gap-2 sm:gap-3" aria-label="Countdown bis zum Release">
        {cells.map(([value, label]) => (
          <div
            key={label}
            className="glass min-w-16 rounded-xl px-3 py-2.5 text-center sm:min-w-20 sm:px-4"
          >
            <span className="block text-xl font-semibold tabular-nums sm:text-2xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
