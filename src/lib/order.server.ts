import { z } from "zod";
import { SHIPPING_FEE, DEFAULT_CURRENCY } from "./catalog";
import { paypalCreateOrder, paypalCaptureOrder } from "./paypal.server";

export const CheckoutInput = z.object({
  email: z.string().email(),
  shipping: z.object({
    name: z.string().min(2),
    street: z.string().min(3),
    zip: z.string().min(3),
    city: z.string().min(2),
    country: z.string().min(2),
  }),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        variant: z.string().min(1),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1),
});
export type CheckoutInput = z.infer<typeof CheckoutInput>;

function priceOf(base: number | null, sale: number | null) {
  const b = Number(base ?? 0);
  const s = sale == null ? null : Number(sale);
  return s != null && s > 0 && s < b ? s : b;
}

/**
 * Verbindliche Preisberechnung auf dem Server.
 * Nur veröffentlichte Produkte sind kaufbar; Preise stammen aus der Datenbank.
 */
export async function priceOrder(items: CheckoutInput["items"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = [...new Set(items.map((i) => i.id))];

  const [{ data: products, error: pErr }, { data: variants, error: vErr }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, status, currency, base_price, sale_price")
      .in("id", ids),
    supabaseAdmin.from("product_variants").select("product_id, name, price, sale_price, available").in("product_id", ids),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;

  const byId = new Map((products ?? []).map((p) => [p.id, p] as const));

  const lines = items.map((line) => {
    const product = byId.get(line.id);
    if (!product) throw new Error(`Unbekanntes Produkt: ${line.id}`);
    if (product.status !== "Veröffentlicht") throw new Error(`Produkt nicht verfügbar: ${product.name}`);
    const variant = (variants ?? []).find((v) => v.product_id === line.id && v.name === line.variant);
    if (variant && variant.available === false) throw new Error(`Variante nicht verfügbar: ${product.name} · ${line.variant}`);
    const unitPrice =
      variant?.price != null
        ? priceOf(Number(variant.price), variant.sale_price as number | null)
        : priceOf(Number(product.base_price), product.sale_price as number | null);
    return {
      ...line,
      name: product.name,
      unitPrice,
      total: Number((unitPrice * line.qty).toFixed(2)),
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const currency = byId.get(items[0]!.id)?.currency || DEFAULT_CURRENCY;
  return { lines, subtotal, shippingFee: SHIPPING_FEE, amount: Number((subtotal + SHIPPING_FEE).toFixed(2)), currency };
}

export async function startCheckout(data: CheckoutInput, userId: string | null) {
  const { lines, amount, currency } = await priceOrder(data.items);
  const paypalOrderId = await paypalCreateOrder(amount);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("orders").insert({
    user_id: userId,
    email: data.email,
    shipping: data.shipping,
    items: lines,
    amount,
    currency,
    status: "created",
    paypal_order_id: paypalOrderId,
  });
  if (error) throw error;

  return { paypalOrderId, amount };
}

export async function finishCheckout(paypalOrderId: string) {
  const status = await paypalCaptureOrder(paypalOrderId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paid = status === "COMPLETED";
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: paid ? "paid" : status.toLowerCase() })
    .eq("paypal_order_id", paypalOrderId)
    .select("id, amount")
    .maybeSingle();
  if (error) throw error;
  return { paid, orderId: data?.id ?? null, amount: data?.amount ?? null };
}
