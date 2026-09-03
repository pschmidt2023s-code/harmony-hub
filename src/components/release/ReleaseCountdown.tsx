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
}: {
  target: Date;
  onExpire?: () => void;
  className?: string;
  showSeconds?: boolean;
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
