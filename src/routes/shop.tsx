import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { PRODUCTS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Offizielles TAYO Merchandise" },
      {
        name: "description",
        content: "Limitierte Hoodies, Vinyl, Caps und Bundles aus dem offiziellen TAYO Store.",
      },
      { property: "og:title", content: "Shop — Offizielles TAYO Merch" },
      { property: "og:description", content: "Hoodies, Vinyl, Caps und Bundles — limitiert und offiziell." },
    ],
  }),
  component: ShopPage,
});

const CATS = ["Alle", "Apparel", "Music", "Accessoires", "Bundle"] as const;

function ShopPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("Alle");
  const list = cat === "Alle" ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);

  return (
    <div className="pt-32">
      <Section eyebrow="Store" title="Merchandise">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full px-5 py-2 text-sm transition-colors",
                cat === c ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <article key={p.id} className="glass group flex flex-col overflow-hidden rounded-2xl">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {p.badge && (
                  <span className="glass-strong absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-medium">{p.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-primary text-primary" /> 4.9 · {p.stock} auf Lager
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.variants.map((v) => (
                    <span key={v} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      {v}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className="text-lg font-semibold text-primary">{p.price} €</span>
                  <button
                    onClick={() => toast.success(`${p.name} in den Warenkorb gelegt`)}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
                  >
                    <ShoppingBag className="size-3.5" /> Kaufen
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Zahlung per Apple Pay, Google Pay, PayPal und Kreditkarte. Versand innerhalb von 2–4 Werktagen.
        </p>
      </Section>
    </div>
  );
}