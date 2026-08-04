import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero-tayo.jpg";
import { Section } from "@/components/Section";
import { ARTIST } from "@/lib/data";

export const Route = createFileRoute("/ueber-mich")({
  head: () => ({
    meta: [
      { title: "Über TAYO — Biografie des Artists" },
      {
        name: "description",
        content: "Die Geschichte hinter TAYO: R&B-Vocals, Synthflächen und Trap-Drums aus Berlin.",
      },
      { property: "og:title", content: "Über TAYO — Biografie" },
      { property: "og:description", content: "Die Geschichte hinter TAYO: R&B, Synthpop und Trap aus Berlin." },
    ],
  }),
  component: AboutPage,
});

const FACTS = [
  ["Debüt", "2021"],
  ["Streams", "42 Mio."],
  ["Releases", "3 EPs · 9 Singles"],
  ["Basis", "Berlin"],
];

function AboutPage() {
  return (
    <div className="pt-32">
      <Section eyebrow="Artist" title="Über mich">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <img
            src={hero}
            alt="Porträt von TAYO"
            width={1600}
            height={1200}
            loading="lazy"
            className="w-full rounded-3xl object-cover shadow-[var(--shadow-elevated)]"
          />
          <div>
            <p className="text-lg leading-relaxed text-muted-foreground">{ARTIST.bio}</p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Nach zwei EPs und Support-Shows in ganz Europa arbeitet TAYO aktuell am Debütalbum
              <span className="text-foreground"> NOCTURNE</span> — aufgenommen zwischen Berlin und Lissabon,
              produziert mit NOVUM und KIRO.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-6">
              {FACTS.map(([k, v]) => (
                <div key={k} className="glass rounded-2xl p-5">
                  <dt className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{k}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>
    </div>
  );
}