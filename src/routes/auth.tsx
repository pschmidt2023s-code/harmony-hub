import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//")
      ? s["next"]
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fan-Login — TAYO Account" },
      {
        name: "description",
        content:
          "Melde dich an oder erstelle deinen TAYO Fan-Account für Favoriten, Pre-Sales und exklusive Inhalte.",
      },
      { property: "og:title", content: "Fan-Login — TAYO Account" },
      { property: "og:description", content: "Favoriten, Pre-Sales und exklusive Inhalte." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const goHome = () => {
      if (next) {
        window.location.href = next;
        return;
      }
      void navigate({ to: "/konto" });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) goHome();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goHome();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: next ? `${window.location.origin}${next}` : window.location.origin,
          data: { display_name: displayName },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Fast geschafft — bestätige deine E-Mail-Adresse.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
    });
    if (result.error) {
      toast.error("Google-Login fehlgeschlagen.");
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 pb-32 pt-32">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">Fan Zone</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Favoriten speichern, Pre-Sales zuerst und exklusive Drops.
        </p>

        <button
          onClick={onGoogle}
          className="mt-6 w-full rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Mit Google fortfahren
        </button>

        <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> oder <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anzeigename"
              aria-label="Anzeigename"
              className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@mail.de"
            aria-label="E-Mail-Adresse"
            className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            aria-label="Passwort"
            className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            disabled={busy}
            className={cn(
              "w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]",
              busy && "opacity-60",
            )}
          >
            {mode === "login" ? "Einloggen" : "Registrieren"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "login" ? "Noch kein Account? Jetzt registrieren" : "Schon dabei? Einloggen"}
        </button>
        <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:text-primary">
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}