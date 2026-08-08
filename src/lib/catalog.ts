/** Server-safe price list (no asset imports). Source of truth for checkout totals. */
export type CatalogItem = { id: string; name: string; price: number };

export const CATALOG: CatalogItem[] = [
  { id: "p1", name: "Midnight Gold Hoodie", price: 89 },
  { id: "p2", name: "Afterglow Vinyl (Gold)", price: 34 },
  { id: "p3", name: "TAYO Cap Embroidered", price: 39 },
  { id: "p4", name: "Vinyl + Hoodie Bundle", price: 109 },
];

export const SHIPPING_FEE = 4.9;

export function catalogItem(id: string) {
  return CATALOG.find((p) => p.id === id);
}
