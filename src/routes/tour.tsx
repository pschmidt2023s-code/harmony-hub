import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Section } from "@/components/Section";
import { seoHead } from "@/lib/seo";
import { TOUR, formatDate } from "@/lib/data";

export const Route = createFileRoute("/tour")({
  head: () =>
    seoHead({
      title: "Live — TAYO",
      description: "Live-Termine von TAYO.",
      path: "/tour",
      // Ohne bestätigte Termine bleibt die Seite aus dem Index.
      noindex: TOUR.length === 0,
    }),
  component: TourPage,
});

function TourPage() {
  const today = new Date().toISOString().slice(0, 10);
  const dates = TOUR.filter((t) => t.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!dates.length) {
    return (
      <div className="pt-32">
        <Section eyebrow="Live" title="Live">
          <div className="glass rounded-2xl px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Aktuell sind keine Live-Termine bestätigt.
            </p>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="pt-32">
      <Section eyebrow="Live" title="Live">
        <div className="glass divide-y divide-border/60 rounded-2xl">
          {dates.map((t) => (
            <div
              key={t.date}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-6 transition-colors hover:bg-secondary/50 sm:px-8"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-primary">{formatDate(t.date)}</p>
                <p className="mt-2 truncate text-2xl font-semibold">{t.city}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" /> {t.venue}
                </p>
              </div>
              <span
                className={
                  t.status === "Ausverkauft"
                    ? "shrink-0 rounded-full border border-border px-5 py-2.5 text-xs text-muted-foreground"
                    : "shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
                }
              >
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}