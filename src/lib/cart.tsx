import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SHIPPING_FEE } from "./catalog";
import { linePrice, shopQueryOptions, type ShopProduct } from "./shop";

export type CartLine = { id: string; variant: string; qty: number };

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  products: ShopProduct[];
  productFor: (id: string) => ShopProduct | undefined;
  priceFor: (id: string, variant: string) => number;
  add: (id: string, variant: string) => void;
  setQty: (id: string, variant: string, qty: number) => void;
  remove: (id: string, variant: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "tayo-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Preise stammen immer aus dem serverseitig gefilterten Katalog.
  const { data: products = [] } = useQuery(shopQueryOptions);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const value = useMemo<CartValue>(() => {
    const productFor = (id: string) => products.find((p) => p.id === id);
    const priceFor = (id: string, variant: string) => linePrice(productFor(id), variant);
    const subtotal = lines.reduce((sum, l) => sum + priceFor(l.id, l.variant) * l.qty, 0);
    return {
      lines,
      products,
      productFor,
      priceFor,
      currency: products[0]?.currency ?? "EUR",
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: Number(subtotal.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: subtotal > 0 ? Number((subtotal + SHIPPING_FEE).toFixed(2)) : 0,
      add: (id, variant) =>
        setLines((prev) => {
          const found = prev.find((l) => l.id === id && l.variant === variant);
          return found
            ? prev.map((l) => (l === found ? { ...l, qty: Math.min(10, l.qty + 1) } : l))
            : [...prev, { id, variant, qty: 1 }];
        }),
      setQty: (id, variant, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => !(l.id === id && l.variant === variant))
            : prev.map((l) => (l.id === id && l.variant === variant ? { ...l, qty: Math.min(10, qty) } : l)),
        ),
      remove: (id, variant) => setLines((prev) => prev.filter((l) => !(l.id === id && l.variant === variant))),
      clear: () => setLines([]),
    };
  }, [lines, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
