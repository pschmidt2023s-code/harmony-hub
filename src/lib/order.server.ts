import { z } from "zod";
import { catalogItem, SHIPPING_FEE } from "./catalog";
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

export function priceOrder(items: CheckoutInput["items"]) {
  const lines = items.map((line) => {
    const product = catalogItem(line.id);
    if (!product) throw new Error(`Unbekanntes Produkt: ${line.id}`);
    return { ...line, name: product.name, unitPrice: product.price, total: product.price * line.qty };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  return { lines, subtotal, shippingFee: SHIPPING_FEE, amount: Number((subtotal + SHIPPING_FEE).toFixed(2)) };
}

export async function startCheckout(data: CheckoutInput, userId: string | null) {
  const { lines, amount } = priceOrder(data.items);
  const paypalOrderId = await paypalCreateOrder(amount);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("orders").insert({
    user_id: userId,
    email: data.email,
    shipping: data.shipping,
    items: lines,
    amount,
    currency: "EUR",
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
