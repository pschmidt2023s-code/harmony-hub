import type { ReleaseRow, SongRow, VideoRow } from "@/lib/admin/releases";
import { isReleasePublic } from "@/lib/admin/releases";

/**
 * Phase 10 — Planungslogik für Pipeline & Kalender.
 * Es gibt KEIN zweites Status-System: alle Stufen leiten sich aus den
 * bestehenden `releases.status`-Werten aus Phase 6 ab.
 */

export const PIPELINE_STAGES = [
  { id: "draft", label: "Entwurf", statuses: ["Entwurf"] },
  { id: "preparing", label: "In Produktion", statuses: ["In Produktion", "Mixing", "Mastering"] },
  { id: "scheduled", label: "Geplant", statuses: ["Geplant", "Vorbestellung"] },
  { id: "published", label: "Veröffentlicht", statuses: ["Veröffentlicht"] },
  { id: "archived", label: "Archiviert", statuses: ["Archiviert"] },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]["id"];

export function stageOf(r: ReleaseRow): StageId {
  const found = PIPELINE_STAGES.find((s) => (s.statuses as readonly string[]).includes(r.status));
  return found?.id ?? "draft";
}

/** Erlaubte Statuswechsel – die Pipeline darf keine Regeln umgehen. */
export function allowedNextStatuses(r: ReleaseRow): string[] {
  switch (stageOf(r)) {
    case "draft":
      return ["In Produktion", "Geplant", "Veröffentlicht", "Archiviert"];
    case "preparing":
      return ["Entwurf", "Mixing", "Mastering", "Geplant", "Veröffentlicht", "Archiviert"];
    case "scheduled":
      return ["Entwurf", "Vorbestellung", "Veröffentlicht", "Archiviert"];
    case "published":
      return ["Entwurf", "Archiviert"];
    case "archived":
      return ["Entwurf"];
    default:
      return [];
  }
}

export type Check = { label: string; ok: boolean };

export type Readiness = {
  required: Check[];
  optional: Check[];
  requiredDone: number;
  requiredTotal: number;
  missing: string[];
  ready: boolean;
  percent: number;
};

export type ReleaseContext = {
  songs: SongRow[];
  videos: VideoRow[];
};

export function releaseSongs(r: ReleaseRow, songs: SongRow[]) {
  return songs
    .filter((s) => s.release_id === r.id)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function releaseVideos(r: ReleaseRow, videos: VideoRow[], songs: SongRow[]) {
  const ids = new Set(releaseSongs(r, songs).map((s) => s.id));
  return videos.filter(
    (v) => v.release_id === r.id || (v.song_id && ids.has(v.song_id)) || (r.video_id && v.id === r.video_id),
  );
}

function nonEmptyObject(value: unknown) {
  return !!value && typeof value === "object" && Object.keys(value as object).length > 0;
}

function nonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

export function releaseReadiness(r: ReleaseRow, ctx: ReleaseContext): Readiness {
  const tracks = releaseSongs(r, ctx.songs);
  const videos = releaseVideos(r, ctx.videos, ctx.songs);
  const needsPublishAt = r.status === "Geplant" || r.status === "Vorbestellung";

  const required: Check[] = [
    { label: "Titel", ok: r.title.trim().length > 0 },
    { label: "Release-Typ", ok: r.type.trim().length > 0 },
    { label: "Artwork", ok: !!r.cover_url },
    { label: "Tracklist", ok: tracks.length > 0 },
    { label: "Audio aller Tracks", ok: tracks.length > 0 && tracks.every((s) => !!s.audio_url) },
    { label: "Release-Datum", ok: !!r.release_date },
    { label: "Slug", ok: !!r.slug },
  ];
  if (needsPublishAt) {
    required.push({ label: "Veröffentlichungszeitpunkt", ok: !!r.publish_at });
  }

  const optional: Check[] = [
    { label: "Beschreibung", ok: r.description.trim().length > 0 || r.short_description.trim().length > 0 },
    { label: "Credits", ok: nonEmptyArray(r.credits) },
    { label: "Streaming-Links", ok: nonEmptyObject(r.links) },
    { label: "Video", ok: videos.length > 0 },
    { label: "SEO", ok: r.seo_title.trim().length > 0 && r.seo_description.trim().length > 0 },
  ];

  const requiredDone = required.filter((c) => c.ok).length;
  return {
    required,
    optional,
    requiredDone,
    requiredTotal: required.length,
    missing: required.filter((c) => !c.ok).map((c) => c.label),
    ready: requiredDone === required.length,
    percent: Math.round((requiredDone / required.length) * 100),
  };
}

/** Effektiver Zeitpunkt für Kalender/Countdown. `release_date` ist ein reines Datum. */
export function effectiveDate(r: ReleaseRow): Date {
  if (r.publish_at) return new Date(r.publish_at);
  return new Date(`${r.release_date}T00:00:00`);
}

export function hasExactTime(r: ReleaseRow) {
  return !!r.publish_at;
}

export function isUpcoming(r: ReleaseRow, now = new Date()) {
  if (r.status === "Archiviert" || r.status === "Entwurf") return false;
  return effectiveDate(r).getTime() > now.getTime();
}

export function isPublicNow(r: ReleaseRow) {
  return isReleasePublic(r);
}

export type Conflict = { releaseId: string; title: string; message: string; level: "error" | "warn" };

export function detectConflicts(releases: ReleaseRow[], ctx: ReleaseContext): Conflict[] {
  const out: Conflict[] = [];
  const byTime = new Map<string, ReleaseRow[]>();

  for (const r of releases) {
    if (r.status === "Archiviert") continue;
    const scheduled = r.status === "Geplant" || r.status === "Vorbestellung";

    if (scheduled) {
      if (!r.publish_at) {
        out.push({
          releaseId: r.id,
          title: r.title,
          message: "Geplant, aber ohne Veröffentlichungszeitpunkt.",
          level: "error",
        });
      } else {
        const key = new Date(r.publish_at).toISOString();
        byTime.set(key, [...(byTime.get(key) ?? []), r]);
      }
      const rd = releaseReadiness(r, ctx);
      for (const m of rd.missing) {
        if (m === "Veröffentlichungszeitpunkt") continue;
        out.push({ releaseId: r.id, title: r.title, message: `Geplant, aber ohne ${m}.`, level: "warn" });
      }
    }
  }

  for (const [, group] of byTime) {
    if (group.length < 2) continue;
    for (const r of group) {
      out.push({
        releaseId: r.id,
        title: r.title,
        message: `Gleicher Veröffentlichungszeitpunkt wie ${group.length - 1} weitere(s) Release(s).`,
        level: "warn",
      });
    }
  }

  return out;
}

export function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function countdownParts(target: Date, now = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    done: diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

/** Kalenderraster: 6 Wochen ab Montag der Woche des Monatsersten. */
export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
