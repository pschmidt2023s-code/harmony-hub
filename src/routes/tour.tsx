import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Section } from "@/components/Section";
import { TOUR, formatDate } from "@/lib/data";

export const Route = createFileRoute("/tour")({
  head: () => ({
    meta: [
      { title: "Tour 2026 — TAYO Live Tickets" },
      {
        name: "description",
        content: "Alle TAYO Live-Termine 2026 in Berlin, Hamburg, Köln, München, Wien und Zürich.",
      },
      { property: "og:title", content: "Tour 2026 — TAYO Live" },
      { property: "og:description", content: "Alle Live-Termine und Tickets der TAYO Tour 2026." },
    ],
  }),
  component: TourPage,
});

function TourPage() {
  return (
    <div className="pt-32">
      <Section eyebrow="Live" title="Tour 2026">
        <div className="glass divide-y divide-border/60 rounded-2xl">
          {TOUR.map((t) => (
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