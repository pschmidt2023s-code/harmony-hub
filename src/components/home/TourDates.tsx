import { Link } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import { formatDate } from "@/lib/data";

type TourDate = { date: string; city: string; venue: string; status: string };

/** Kommende Live-Termine. Ohne anstehende Daten: keine Sektion. */
export function TourDates({ dates }: { dates: TourDate[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = dates.filter((d) => d.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!upcoming.length) return null;

  return (
    <Section
      eyebrow="Live"
      title="Tourdaten"
      action={
        <Link to="/tour" className="hidden text-sm text-primary hover:underline sm:block">
          Alle Termine
        </Link>
      }
    >
      <div className="glass divide-y divide-border/60 rounded-2xl">
        {upcoming.slice(0, 5).map((t) => (
          <div
            key={t.date}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-secondary/50"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-semibold sm:text-lg">
                {t.city} <span className="text-muted-foreground">· {t.venue}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
            {t.status === "Ausverkauft" ? (
              <span className="shrink-0 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
                Ausverkauft
              </span>
            ) : (
              <Link
                to="/tour"
                className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform hover:scale-105"
              >
                {t.status}
              </Link>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
