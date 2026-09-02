import { Calendar } from "lucide-react";
import { Section } from "@/components/Section";
import { formatDate, type Release } from "@/lib/data";
import { daysUntil } from "@/lib/release";

/** Vorschau auf angekündigte Releases. Rendert nichts, wenn keine existieren. */
export function UpcomingReleases({ releases }: { releases: Release[] }) {
  if (!releases.length) return null;

  return (
    <Section eyebrow="Release Kalender" title="Kommende Releases">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {releases.slice(0, 3).map((r) => {
          const days = daysUntil(r.date);
          return (
            <article key={r.id} className="glass group overflow-hidden rounded-2xl">
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={r.cover}
                  alt={`Cover ${r.title}`}
                  width={800}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="glass-strong absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                  {r.status}
                </span>
              </div>
              <div className="p-5">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" /> {formatDate(r.date)} · {r.type}
                  {days !== null && <span className="text-primary">in {days} Tagen</span>}
                </p>
                <h3 className="mt-2 truncate text-xl font-semibold">{r.title}</h3>
                {r.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
