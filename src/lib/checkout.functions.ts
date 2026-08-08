import { createServerFn } from "@tanstack/react-start";
import { CheckoutInput, startCheckout, finishCheckout } from "./order.server";
import { paypalClientId } from "./paypal.server";
import { z } from "zod";

export const getPaypalConfig = createServerFn({ method: "GET" }).handler(async () => paypalClientId());

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CheckoutInput.parse(data))
  .handler(async ({ data }) => startCheckout(data, null));

export const captureCheckoutOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ paypalOrderId: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => finishCheckout(data.paypalOrderId));
