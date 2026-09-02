import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import {
  countdownParts,
  effectiveDate,
  formatDateTime,
  hasExactTime,
  releaseReadiness,
  releaseSongs,
  releaseVideos,
  type ReleaseContext,
  type Readiness,
} from "@/lib/admin/pipeline";
import type { ReleaseRow } from "@/lib/admin/releases";

export function ReadinessBadge({ readiness }: { readiness: Readiness }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] ${
        readiness.ready ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      }`}
      title={readiness.ready ? "Alle Pflichtangaben vollständig" : `Fehlt: ${readiness.missing.join(", ")}`}
    >
      {readiness.ready ? <Check className="size-3" /> : <X className="size-3" />}
      {readiness.ready ? "Bereit" : "Nicht bereit"} · {readiness.requiredDone}/{readiness.requiredTotal}
    </span>
  );
}

export function ChecklistRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      {ok ? <Check className="size-3.5 text-primary" /> : <X className="size-3.5" />}
      {label}
    </li>
  );
}

export function Countdown({ target }: { target: Date }) {
  const [parts, setParts] = useState(() => countdownParts(target));
  useEffect(() => {
    setParts(countdownParts(target));
    const id = window.setInterval(() => setParts(countdownParts(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (parts.done) return <span className="text-xs text-muted-foreground">Zeitpunkt erreicht</span>;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-primary">
      <span>{parts.days}T</span>
      <span>{String(parts.hours).padStart(2, "0")}h</span>
      <span>{String(parts.minutes).padStart(2, "0")}m</span>
      <span>{String(parts.seconds).padStart(2, "0")}s</span>
    </span>
  );
}

export function ReleaseDetailDrawer({
  release,
  ctx,
  onClose,
}: {
  release: ReleaseRow;
  ctx: ReleaseContext;
  onClose: () => void;
}) {
  const readiness = releaseReadiness(release, ctx);
  const tracks = releaseSongs(release, ctx.songs);
  const videos = releaseVideos(release, ctx.videos, ctx.songs);
  const when = effectiveDate(release);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur" onClick={onClose}>
      <aside
        className="glass-strong h-full w-full max-w-md overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <img
            src={release.cover_url || "/icons/icon-192.png"}
            alt=""
            loading="lazy"
            className="size-20 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold uppercase">{release.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {release.type} · {release.status}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasExactTime(release) ? formatDateTime(when) : release.release_date}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
          <p>Tracks: {tracks.length}</p>
          <p>Videos: {videos.length}</p>
          <p>Zuletzt bearbeitet: {formatDateTime(new Date(release.updated_at))}</p>
        </div>

        <div className="mt-6">
          <ReadinessBadge readiness={readiness} />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Pflicht</p>
          <ul className="mt-2 grid gap-1.5">
            {readiness.required.map((c) => (
              <ChecklistRow key={c.label} {...c} />
            ))}
          </ul>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Optional</p>
          <ul className="mt-2 grid gap-1.5">
            {readiness.optional.map((c) => (
              <ChecklistRow key={c.label} {...c} />
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/admin/releases/$id/edit"
            params={{ id: release.id }}
            className="glass rounded-full px-4 py-2 text-xs hover:text-primary"
          >
            Bearbeiten
          </Link>
          <Link
            to="/admin/releases/$id/preview"
            params={{ id: release.id }}
            className="glass rounded-full px-4 py-2 text-xs hover:text-primary"
          >
            Vorschau
          </Link>
          <Link to="/admin/releases/calendar" className="glass rounded-full px-4 py-2 text-xs hover:text-primary">
            Kalender
          </Link>
          <Link to="/admin/releases/pipeline" className="glass rounded-full px-4 py-2 text-xs hover:text-primary">
            Pipeline
          </Link>
        </div>
      </aside>
    </div>
  );
}
