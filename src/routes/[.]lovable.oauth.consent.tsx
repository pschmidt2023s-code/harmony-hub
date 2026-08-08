import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};

const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase session lives in localStorage, absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center px-5 pt-32">
      <div className="glass max-w-md rounded-3xl p-8 text-center text-sm text-muted-foreground">
        Diese Autorisierungsanfrage konnte nicht geladen werden: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "diese App";

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Der Autorisierungsserver hat keine Weiterleitung zurückgegeben.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 pb-32 pt-32">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">Zugriff erlauben</p>
        <h1 className="mt-3 text-2xl font-semibold">{clientName} mit deinem Konto verbinden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} kann dann in deinem Namen auf den TAYO-Katalog und deine Favoriten zugreifen.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Erlauben
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border px-5 py-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </main>
  );
}