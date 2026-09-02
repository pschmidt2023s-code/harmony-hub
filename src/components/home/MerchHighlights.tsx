import { Link } from "@tanstack/react-router";
import { Section } from "@/components/Section";
import type { Product } from "@/lib/data";

/** Kuratierte Merch-Auswahl (max. 4). Ohne Produkte: keine Sektion. */
export function MerchHighlights({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <Section
      eyebrow="Store"
      title="Merch Highlights"
      action={
        <Link to="/shop" className="hidden text-sm text-primary hover:underline sm:block">
          Zum Shop
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <Link key={p.id} to="/shop" className="glass group overflow-hidden rounded-2xl">
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src={p.image}
                alt={p.name}
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-primary">{p.price} €</p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
