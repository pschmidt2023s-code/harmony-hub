import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { useCart } from "@/lib/cart";
import { getPaypalConfig, createCheckoutOrder, captureCheckoutOrder } from "@/lib/checkout.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout — TAYO Merch bezahlen" },
      {
        name: "description",
        content: "Bestellung abschließen und sicher per PayPal bezahlen — offizieller TAYO Store.",
      },
      { property: "og:title", content: "Checkout — TAYO Store" },
      { property: "og:description", content: "Merch-Bestellung sicher per PayPal abschließen." },
    ],
  }),
  component: CheckoutPage,
});

type PayPalNamespace = {
  Buttons: (opts: {
    style?: Record<string, string>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
  }) => { render: (el: HTMLElement) => Promise<void> };
};

function usePaypalSdk(clientId: string | null) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [clientId]);
  return ready;
}

function CheckoutPage() {
  const cart = useCart();
  const [clientId, setClientId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    street: "",
    zip: "",
    city: "",
    country: "Deutschland",
  });
  const [done, setDone] = useState<{ orderId: string | null; amount: number | null } | null>(null);
  const buttonsRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);
  const formRef = useRef(form);
  const cartRef = useRef(cart);
  formRef.current = form;
  cartRef.current = cart;

  useEffect(() => {
    getPaypalConfig()
      .then((cfg) => setClientId(cfg.clientId))
      .catch(() => setClientId(null))
      .finally(() => setConfigLoaded(true));
  }, []);

  const sdkReady = usePaypalSdk(clientId);

  useEffect(() => {
    if (!sdkReady || renderedRef.current || !buttonsRef.current) return;
    const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
    if (!paypal) return;
    renderedRef.current = true;
    void paypal
      .Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal" },
        createOrder: async () => {
          const f = formRef.current;
          const c = cartRef.current;
          if (!c.lines.length) throw new Error("Warenkorb ist leer");
          if (!f.email || !f.name || !f.street || !f.zip || !f.city) {
            toast.error("Bitte fülle alle Lieferfelder aus.");
            throw new Error("Formular unvollständig");
          }
          const res = await createCheckoutOrder({
            data: {
              email: f.email,
              shipping: { name: f.name, street: f.street, zip: f.zip, city: f.city, country: f.country },
              items: c.lines,
            },
          });
          return res.paypalOrderId;
        },
        onApprove: async (data) => {
          const res = await captureCheckoutOrder({ data: { paypalOrderId: data.orderID } });
          if (!res.paid) {
            toast.error("Zahlung nicht abgeschlossen.");
            return;
          }
          cartRef.current.clear();
          setDone({ orderId: res.orderId, amount: res.amount });
          toast.success("Zahlung erfolgreich — danke!");
        },
        onError: () => toast.error("PayPal-Zahlung fehlgeschlagen."),
      })
      .render(buttonsRef.current);
  }, [sdkReady]);

  if (done) {
    return (
      <div className="pt-32">
        <Section eyebrow="Bestellung" title="Danke für deinen Kauf">
          <div className="glass max-w-lg rounded-3xl p-8">
            <p className="text-sm text-muted-foreground">
              Deine Zahlung über <span className="text-primary">{done.amount?.toFixed(2)} €</span> ist eingegangen.
              Wir schicken dir eine Bestätigung per E-Mail.
            </p>
            {done.orderId && (
              <p className="mt-3 text-xs text-muted-foreground">Bestellnummer: {done.orderId}</p>
            )}
            <Link
              to="/shop"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Weiter shoppen
            </Link>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="pt-32">
      <Section eyebrow="Checkout" title="Bestellung abschließen">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Lieferadresse</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["email", "E-Mail", "sm:col-span-2"],
                  ["name", "Vor- und Nachname", "sm:col-span-2"],
                  ["street", "Straße & Hausnummer", "sm:col-span-2"],
                  ["zip", "PLZ", ""],
                  ["city", "Stadt", ""],
                  ["country", "Land", "sm:col-span-2"],
                ] as const
              ).map(([key, label, span]) => (
                <input
                  key={key}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                  aria-label={label}
                  type={key === "email" ? "email" : "text"}
                  className={cn(
                    "glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring",
                    span,
                  )}
                />
              ))}
            </div>
          </div>

          <div className="glass h-fit rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Warenkorb</h2>
            {cart.lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Dein Warenkorb ist leer.{" "}
                <Link to="/shop" className="text-primary">
                  Zum Shop
                </Link>
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-3">
                  {cart.lines.map((l) => {
                    const p = cart.productFor(l.id);
                    return (
                      <li key={`${l.id}-${l.variant}`} className="flex items-center gap-3">
                        {p && (
                          <img
                            src={p.image}
                            alt={p.name}
                            width={56}
                            height={56}
                            loading="lazy"
                            className="size-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{p?.name ?? l.id}</p>
                          <p className="text-xs text-muted-foreground">{l.variant}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            aria-label="Menge verringern"
                            onClick={() => cart.setQty(l.id, l.variant, l.qty - 1)}
                            className="size-7 rounded-full border border-border text-sm"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm">{l.qty}</span>
                          <button
                            aria-label="Menge erhöhen"
                            onClick={() => cart.setQty(l.id, l.variant, l.qty + 1)}
                            className="size-7 rounded-full border border-border text-sm"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-16 text-right text-sm text-primary">
                          {((p?.price ?? 0) * l.qty).toFixed(2)} €
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <dl className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Zwischensumme</dt>
                    <dd>{cart.subtotal.toFixed(2)} €</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Versand</dt>
                    <dd>{cart.shippingFee.toFixed(2)} €</dd>
                  </div>
                  <div className="flex justify-between pt-1 text-base font-semibold">
                    <dt>Gesamt</dt>
                    <dd className="text-primary">{cart.total.toFixed(2)} €</dd>
                  </div>
                </dl>
                <div className="mt-6" ref={buttonsRef} />
                {configLoaded && !clientId && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    PayPal ist noch nicht verbunden. Sobald die PayPal-Zugangsdaten hinterlegt sind,
                    erscheint hier der Bezahl-Button.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
