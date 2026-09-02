import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Disc3, Mail, ShieldAlert, Users } from "lucide-react";
import { Section } from "@/components/Section";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { OrdersPanel } from "@/components/admin/OrdersPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin-Panel — TAYO Verwaltung" },
      { name: "description", content: "Interne Verwaltung von Releases, Fans und Newsletter." },
      { property: "og:title", content: "Admin-Panel — TAYO" },
      { property: "og:description", content: "Interne Verwaltung der Artist-Plattform." },
    ],
  }),
  component: AdminPage,
});

type Subscriber = { id: string; email: string; created_at: string };

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const { data: content } = useQuery(contentQueryOptions);
  const releases = content?.releases ?? [];
  const songs = content?.songs ?? [];
  const videos = content?.videos ?? [];

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
      if (!data) return;
      const { data: rows } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      setSubs(rows ?? []);
    })();
  }, []);

  if (isAdmin === null) {
    return <div className="pt-40 text-center text-sm text-muted-foreground">Lade…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 pt-32">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Kein Zugriff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Bereich ist dem Artist-Team vorbehalten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32">
      <Section eyebrow="Intern" title="Admin-Panel">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Disc3 className="size-4" />} label="Releases" value={releases.length} />
          <Stat icon={<Users className="size-4" />} label="Songs / Videos" value={`${songs.length} / ${videos.length}`} />
          <Stat icon={<Mail className="size-4" />} label="Newsletter" value={subs.length} />
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <p className="text-sm font-semibold">Newsletter-Abonnenten</p>
          {subs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Noch keine Anmeldungen.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{s.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("de-DE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <OrdersPanel />
        </div>

        <div className="mt-8">
          <ContentEditor />
        </div>
      </Section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}