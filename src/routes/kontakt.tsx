import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import { NewsletterForm } from "@/components/NewsletterForm";
import { seoHead } from "@/lib/seo";

/**
 * Phase 17 — Low Profile.
 *
 * Es gibt aktuell keine öffentlichen Booking-, Management- oder Presse-Kontakte
 * und keinen zustellenden Nachrichtenkanal. Statt erfundener Adressen und eines
 * Formulars ohne Empfänger bleibt nur der real funktionierende Weg: der
 * Newsletter. Die Seite ist nicht verlinkt und nicht indexiert.
 */
export const Route = createFileRoute("/kontakt")({
  head: () =>
    seoHead({
      title: "Kontakt — TAYO",
      description: "Kontaktmöglichkeiten von TAYO.",
      path: "/kontakt",
      noindex: true,
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="pt-32">
      <Section eyebrow="Kontakt" title="Kontakt">
        <div className="glass mx-auto max-w-2xl rounded-2xl px-6 py-12 text-center md:px-10">
          <p className="text-sm text-muted-foreground">
            Derzeit gibt es keinen öffentlichen Booking- oder Presse-Kontakt. Updates kommen
            zuerst über den Newsletter.
          </p>
          <NewsletterForm
            className="mx-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            inputClassName="glass min-w-0 flex-1 rounded-full px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            buttonClassName="min-h-11 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          />
        </div>
      </Section>
    </div>
  );
}
