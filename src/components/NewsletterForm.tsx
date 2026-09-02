import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function NewsletterForm({
  className,
  inputClassName,
  buttonClassName,
  buttonLabel = "Abonnieren",
}: {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setBusy(true);
    // Explizite Einwilligung: nur dieser Weg legt ein Abo an.
    // Bereits abgemeldete Adressen werden NICHT automatisch reaktiviert (Unique-Konflikt).
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: value, source, consent_at: new Date().toISOString() });
    setBusy(false);
    if (error) {
      toast[error.code === "23505" ? "info" : "error"](
        error.code === "23505" ? "Du bist bereits eingetragen." : "Eintrag fehlgeschlagen.",
      );
      return;
    }
    setEmail("");
    toast.success("Willkommen im Loop — Bestätigung folgt per Mail.");
  };

  return (
    <form className={className} onSubmit={onSubmit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="deine@mail.de"
        aria-label="E-Mail-Adresse"
        className={inputClassName}
      />
      <button disabled={busy} className={cn(buttonClassName, busy && "opacity-60")}>
        {busy ? "…" : buttonLabel}
      </button>
    </form>
  );
}