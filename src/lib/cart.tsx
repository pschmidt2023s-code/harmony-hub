import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { catalogItem, SHIPPING_FEE } from "./catalog";

export type CartLine = { id: string; variant: string; qty: number };

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  add: (id: string, variant: string) => void;
  setQty: (id: string, variant: string, qty: number) => void;
  remove: (id: string, variant: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "tayo-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

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
    const subtotal = lines.reduce((sum, l) => sum + (catalogItem(l.id)?.price ?? 0) * l.qty, 0);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
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
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
