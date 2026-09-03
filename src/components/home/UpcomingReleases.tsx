import { Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import { ReleaseCountdown } from "@/components/release/ReleaseCountdown";
import { formatDate, type Release } from "@/lib/data";
import { releaseMoment } from "@/lib/release";

/** Vorschau auf angekündigte Releases. Rendert nichts, wenn keine existieren. */
export function UpcomingReleases({ releases }: { releases: Release[] }) {
  const queryClient = useQueryClient();
  if (!releases.length) return null;

  // Zeitpunkt erreicht -> Content neu laden, damit die zentrale Visibility-Logik greift.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["site-content"] });

  return (
    <Section eyebrow="Release Kalender" title="Kommende Releases">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {releases.slice(0, 3).map((r) => (
          <Link
            key={r.id}
            to="/releases/$slug"
            params={{ slug: r.slug }}
            aria-label={`Release ${r.title} ansehen`}
            className="glass group block overflow-hidden rounded-2xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
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
              </p>
              <ReleaseCountdown
                target={releaseMoment(r)}
                onExpire={refresh}
                showSeconds={false}
                className="mt-2 min-h-4"
              />
              <h3 className="mt-2 truncate text-xl font-semibold transition-colors group-hover:text-primary">
                {r.title}
              </h3>
              {r.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
