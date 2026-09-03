import { useEffect, useState } from "react";

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

/** Restzeit bis zum Zeitpunkt. Reine Funktion, keine Zeitzonen-Eigenlogik (Target ist ein echtes Date). */
export function countdownTo(target: Date, now: number = Date.now()): CountdownParts {
  const diff = target.getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

/**
 * Live-Countdown im TAYO-Stil: eine einzige Timer-Instanz, sauberes Cleanup.
 * Rendert nichts mehr, sobald der Zeitpunkt erreicht ist – `onExpire` erlaubt
 * dem Aufrufer, die bestehende Visibility-Logik neu auszuwerten.
 */
export function ReleaseCountdown({
  target,
  onExpire,
  className = "",
  showSeconds = true,
  variant = "inline",
}: {
  target: Date;
  onExpire?: () => void;
  className?: string;
  showSeconds?: boolean;
  variant?: "inline" | "hero";
}) {
  const [parts, setParts] = useState(() => countdownTo(target));

  useEffect(() => {
    setParts(countdownTo(target));
    const id = window.setInterval(() => setParts(countdownTo(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (parts.done) onExpire?.();
  }, [parts.done, onExpire]);

  if (parts.done) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `Noch ${parts.days} Tage, ${parts.hours} Stunden und ${parts.minutes} Minuten bis zur Veröffentlichung`;

  if (variant === "hero") {
    const cells: { value: string; unit: string }[] = [
      { value: String(parts.days), unit: parts.days === 1 ? "Tag" : "Tage" },
      { value: pad(parts.hours), unit: "Std" },
      { value: pad(parts.minutes), unit: "Min" },
      ...(showSeconds ? [{ value: pad(parts.seconds), unit: "Sek" }] : []),
    ];
    return (
      <div className={`flex flex-wrap gap-2 sm:gap-3 ${className}`} aria-label={label} role="timer">
        {cells.map((c) => (
          <div
            key={c.unit}
            className="glass min-w-[4.25rem] rounded-2xl px-3 py-3 text-center sm:min-w-[5.5rem] sm:px-4"
          >
            <div className="font-mono text-2xl font-bold tabular-nums text-primary sm:text-4xl">{c.value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{c.unit}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xs uppercase tabular-nums tracking-[0.18em] text-primary ${className}`}
      aria-label={`Noch ${parts.days} Tage, ${parts.hours} Stunden und ${parts.minutes} Minuten bis zur Veröffentlichung`}
    >
      <span>{parts.days} Tage</span>
      <span aria-hidden className="text-muted-foreground">·</span>
      <span>{pad(parts.hours)} Std</span>
      <span aria-hidden className="text-muted-foreground">·</span>
      <span>{pad(parts.minutes)} Min</span>
      {showSeconds && (
        <>
          <span aria-hidden className="text-muted-foreground">·</span>
          <span>{pad(parts.seconds)} Sek</span>
        </>
      )}
    </span>
  );
}
