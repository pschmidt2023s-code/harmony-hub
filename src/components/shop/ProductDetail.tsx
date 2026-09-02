import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { useCart } from "@/lib/cart";
import { money, type ShopProduct } from "@/lib/shop";
import { cn } from "@/lib/utils";

/** Öffentliche Produktansicht — wird auch für die Admin-Vorschau wiederverwendet. */
export function ProductDetail({ product, canBuy = true }: { product: ShopProduct; canBuy?: boolean }) {
  const cart = useCart();
  const [variant, setVariant] = useState(product.variants[0]?.name ?? "Standard");
  const active = product.variants.find((v) => v.name === variant);
  const price = active?.price ?? product.price;

  return (
    <Section eyebrow={product.type} title={product.name}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="glass overflow-hidden rounded-3xl">
          <img
            src={product.image}
            alt={product.name}
            width={1000}
            height={1000}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover"
          />
        </div>
        <div>
          {product.shortDescription && <p className="text-sm text-muted-foreground">{product.shortDescription}</p>}
          <p className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-primary">{money(price, product.currency)}</span>
            {product.salePrice != null && product.salePrice < product.basePrice && (
              <span className="text-sm text-muted-foreground line-through">
                {money(product.basePrice, product.currency)}
              </span>
            )}
          </p>
          {product.isDigital && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Download className="size-3.5 text-primary" /> Digitales Produkt
            </p>
          )}

          {product.variants.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  disabled={!v.available}
                  onClick={() => setVariant(v.name)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                    variant === v.name
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              disabled={!canBuy}
              onClick={() => {
                cart.add(product.id, variant);
                toast.success(`${product.name} in den Warenkorb gelegt`);
              }}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <ShoppingBag className="size-4" /> In den Warenkorb
            </button>
            <Link
              to="/shop"
              className="rounded-full border border-border px-6 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Zurück zum Shop
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
