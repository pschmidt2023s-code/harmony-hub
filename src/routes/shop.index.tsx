import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { useCart } from "@/lib/cart";
import { money, shopQueryOptions } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(shopQueryOptions),
  head: () => ({
    meta: [
      { title: "Shop — Offizielles TAYO Merchandise" },
      {
        name: "description",
        content: "Limitierte Hoodies, Vinyl, Caps und Bundles aus dem offiziellen TAYO Store.",
      },
      { property: "og:title", content: "Shop — Offizielles TAYO Merch" },
      { property: "og:description", content: "Hoodies, Vinyl, Caps und Bundles — limitiert und offiziell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <div className="pt-32">
      <Section eyebrow="Store" title="Merchandise">
        <p className="text-sm text-muted-foreground">Der Shop konnte gerade nicht geladen werden.</p>
      </Section>
    </div>
  ),
  notFoundComponent: () => (
    <div className="pt-32">
      <Section eyebrow="Store" title="Merchandise">
        <p className="text-sm text-muted-foreground">Nicht gefunden.</p>
      </Section>
    </div>
  ),
  component: ShopPage,
});

function ShopPage() {
  const { data: products } = useSuspenseQuery(shopQueryOptions);
  const [cat, setCat] = useState("Alle");
  const cart = useCart();
  const [variants, setVariants] = useState<Record<string, string>>({});

  const cats = ["Alle", ...new Set(products.map((p) => p.type))];
  const list = cat === "Alle" ? products : products.filter((p) => p.type === cat);

  return (
    <div className="pt-32">
      <Section eyebrow="Store" title="Merchandise">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aktuell sind keine Produkte verfügbar.</p>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm transition-colors",
                    cat === c
                      ? "bg-primary text-primary-foreground"
                      : "glass text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((p) => {
                const selected = variants[p.id] ?? p.variants[0]?.name ?? "Standard";
                return (
                  <article key={p.id} className="glass group flex flex-col overflow-hidden rounded-2xl">
                    <Link to="/shop/$slug" params={{ slug: p.slug }} className="relative block aspect-[4/5] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        width={800}
                        height={1000}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {p.badge && (
                        <span className="glass-strong absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                          {p.badge}
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <Link to="/shop/$slug" params={{ slug: p.slug }} className="font-medium hover:text-primary">
                        {p.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.isDigital ? "Digitales Produkt" : p.stock != null ? `${p.stock} auf Lager` : p.type}
                      </p>
                      {p.variants.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.variants.map((v) => (
                            <button
                              key={v.id}
                              disabled={!v.available}
                              onClick={() => setVariants((s) => ({ ...s, [p.id]: v.name }))}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-40",
                                selected === v.name
                                  ? "border-primary text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-5">
                        <span className="text-lg font-semibold text-primary">{money(p.price, p.currency)}</span>
                        <button
                          onClick={() => {
                            cart.add(p.id, selected);
                            toast.success(`${p.name} in den Warenkorb gelegt`);
                          }}
                          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
                        >
                          <ShoppingBag className="size-3.5" /> In den Warenkorb
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Sichere Zahlung per PayPal. Versand innerhalb von 2–4 Werktagen.
          </p>
          {cart.count > 0 && (
            <Link
              to="/checkout"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Zur Kasse — {cart.count} Artikel · {money(cart.total, cart.currency)}
            </Link>
          )}
        </div>
      </Section>
    </div>
  );
}
