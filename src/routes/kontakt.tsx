import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Section } from "@/components/Section";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt & Booking — TAYO" },
      {
        name: "description",
        content: "Booking-Anfragen, Presse und Management-Kontakt für TAYO.",
      },
      { property: "og:title", content: "Kontakt & Booking — TAYO" },
      { property: "og:description", content: "Booking, Presse und Management-Anfragen an TAYO." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(100),
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  topic: z.string().max(50),
  message: z.string().trim().min(1, "Nachricht fehlt").max(1000),
});

function ContactPage() {
  return (
    <div className="pt-32">
      <Section eyebrow="Kontakt" title="Booking & Presse">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <form
            className="glass space-y-4 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const parsed = schema.safeParse(Object.fromEntries(form));
              if (!parsed.success) {
                toast.error(parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen");
                return;
              }
              toast.success("Danke! Wir melden uns innerhalb von 48 Stunden.");
              e.currentTarget.reset();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Name" />
              <Field name="email" label="E-Mail" type="email" />
            </div>
            <div>
              <label htmlFor="topic" className="text-xs uppercase tracking-widest text-muted-foreground">
                Anliegen
              </label>
              <select
                id="topic"
                name="topic"
                className="glass mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option>Booking</option>
                <option>Presse</option>
                <option>Feature / Kollaboration</option>
                <option>Sonstiges</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="text-xs uppercase tracking-widest text-muted-foreground">
                Nachricht
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                maxLength={1000}
                className="glass mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
              Anfrage senden
            </button>
          </form>

          <div className="space-y-4">
            {[
              ["Booking", "booking@tayo-music.com"],
              ["Management", "mgmt@tayo-music.com"],
              ["Presse", "press@tayo-music.com"],
            ].map(([k, v]) => (
              <div key={k} className="glass rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{k}</p>
                <p className="mt-2 text-lg text-primary">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        maxLength={255}
        className="glass mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}