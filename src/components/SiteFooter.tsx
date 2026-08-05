import { Link } from "@tanstack/react-router";
import { Instagram, Music2, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 pb-32 pt-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-4 md:px-8">
        <div>
          <p className="text-lg font-semibold tracking-[0.35em]">TAYO</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            R&B · Synthpop · Pop · Trap. Offizielle Plattform für Musik, Releases und Merch.
          </p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Youtube, Music2].map((Icon, i) => (
              <a
                key={i}
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Social Media"
                className="glass grid size-10 place-items-center rounded-full transition-colors hover:text-primary"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol
          title="Entdecken"
          links={[
            { to: "/musik", label: "Musik" },
            { to: "/videos", label: "Videos" },
            { to: "/tour", label: "Tour" },
            { to: "/shop", label: "Shop" },
          ]}
        />
        <FooterCol
          title="Artist"
          links={[
            { to: "/ueber-mich", label: "Über mich" },
            { to: "/kontakt", label: "Kontakt" },
            { to: "/kontakt", label: "Booking" },
            { to: "/kontakt", label: "Presse" },
          ]}
        />
        <div>
          <p className="text-sm font-semibold">Newsletter</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Releases, Pre-Sales und Ticket-Vorverkauf zuerst.
          </p>
          <NewsletterForm
            className="mt-4 flex gap-2"
            inputClassName="glass min-w-0 flex-1 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            buttonClassName="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            buttonLabel="Go"
          />
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 px-5 text-xs text-muted-foreground md:flex-row md:justify-between md:px-8">
        <p>© {new Date().getUTCFullYear()} TAYO. Alle Rechte vorbehalten.</p>
        <p>Impressum · Datenschutz · AGB</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l, i) => (
          <li key={i}>
            <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}