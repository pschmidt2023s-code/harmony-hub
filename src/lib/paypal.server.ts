const API = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function creds() {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  const env = (process.env["PAYPAL_ENV"] ?? "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  if (!clientId || !secret) throw new Error("PayPal ist noch nicht konfiguriert.");
  return { clientId, secret, base: API[env as "sandbox" | "live"] };
}

export function paypalClientId() {
  const id = process.env["PAYPAL_CLIENT_ID"];
  const env = (process.env["PAYPAL_ENV"] ?? "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  return { clientId: id ?? null, env };
}

async function accessToken() {
  const { clientId, secret, base } = creds();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal-Auth fehlgeschlagen (${res.status})`);
  const json = (await res.json()) as { access_token: string };
  return { token: json.access_token, base };
}

export async function paypalCreateOrder(amount: number, currency = "EUR", reference?: string) {
  const { token, base } = await accessToken();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: reference ?? "default",
          amount: { currency_code: currency, value: amount.toFixed(2) },
          description: "TAYO Merch",
        },
      ],
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message ?? "PayPal-Bestellung fehlgeschlagen");
  return json.id;
}

export async function paypalCaptureOrder(orderId: string) {
  const { token, base } = await accessToken();
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  const json = (await res.json()) as { status?: string; message?: string };
  if (!res.ok) throw new Error(json.message ?? "PayPal-Zahlung fehlgeschlagen");
  return json.status ?? "UNKNOWN";
}
