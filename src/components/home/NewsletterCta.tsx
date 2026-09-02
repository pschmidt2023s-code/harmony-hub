import { NewsletterForm } from "@/components/NewsletterForm";

/** Newsletter-Anmeldung im TAYO-Look. Nutzt das bestehende Newsletter-Backend. */
export function NewsletterCta() {
  return (
    <section className="pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="glass relative overflow-hidden rounded-3xl px-6 py-14 md:px-16 md:py-20">
          <div
            className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-50 blur-3xl"
            style={{ background: "var(--accent-glow)" }}
          />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-center">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.4em] text-primary">Newsletter</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                Bleib im Loop
              </h2>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                Release-Alerts, Pre-Sales und Backstage-Content — direkt in dein Postfach.
              </p>
            </div>
            <NewsletterForm
              className="flex w-full flex-col gap-3 sm:flex-row"
              inputClassName="glass min-w-0 flex-1 rounded-full px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              buttonClassName="rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
