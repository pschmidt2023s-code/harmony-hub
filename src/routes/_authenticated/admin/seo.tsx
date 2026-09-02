import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SeoDefaults } from "@/components/admin/seo/SeoDefaults";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  component: AdminSeoPage,
});

const FILES = [
  { href: "/sitemap.xml", label: "Sitemap ansehen", hint: "Enthält ausschließlich veröffentlichte Inhalte." },
  { href: "/robots.txt", label: "robots.txt ansehen", hint: "Admin-, Auth- und Checkout-Bereiche sind ausgeschlossen." },
];

function AdminSeoPage() {
  return (
    <>
      <AdminPageHeader
        title="SEO"
        description="Standard-Metadaten, Vorschauen, Sitemap und Suchmaschinen-Einstellungen."
      />
      <SeoDefaults />

      <div className="glass mt-6 rounded-2xl p-6">
        <p className="text-sm font-semibold">Indexierung</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Entwürfe, geplante, offline gestellte und archivierte Inhalte werden serverseitig ausgeschlossen und
          tauchen weder in der Sitemap noch in Suchergebnissen auf.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FILES.map((f) => (
            <a
              key={f.href}
              href={f.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border/60 p-4 transition-colors hover:border-primary"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                {f.label} <ExternalLink className="size-3.5" />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{f.hint}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
