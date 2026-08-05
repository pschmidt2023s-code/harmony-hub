import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { supabase } from "@/integrations/supabase/client";
import { SONGS, formatTime } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/konto")({
  head: () => ({
    meta: [
      { title: "Mein Konto — TAYO Fan Zone" },
      { name: "description", content: "Profil, gespeicherte Favoriten und Account-Einstellungen." },
      { property: "og:title", content: "Mein Konto — TAYO Fan Zone" },
      { property: "og:description", content: "Profil und Favoriten deines TAYO Fan-Accounts." },
    ],
  }),
  component: KontoPage,
});

function KontoPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const [{ data: profile }, { data: roles }, { data: favs }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("favorites").select("song_id").eq("user_id", user.id),
      ]);
      setDisplayName(profile?.display_name ?? "");
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setFavorites((favs ?? []).map((f) => f.song_id));
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName });
    setSaving(false);
    toast[error ? "error" : "success"](error ? "Speichern fehlgeschlagen." : "Profil gespeichert.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const favSongs = SONGS.filter((s) => favorites.includes(s.id));

  return (
    <div className="pt-32">
      <Section eyebrow="Fan Zone" title="Mein Konto">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm font-semibold">Profil</p>
            <p className="mt-1 text-xs text-muted-foreground">{email}</p>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anzeigename"
              aria-label="Anzeigename"
              className="glass mt-4 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Speichern
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" /> Abmelden
              </button>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Shield className="size-4" /> Admin-Panel öffnen
              </Link>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Heart className="size-4 text-primary" /> Favoriten
            </p>
            {favSongs.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Noch keine Favoriten — markiere Songs im Player mit dem Herz.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {favSongs.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
                    <img src={s.cover} alt={s.title} width={48} height={48} loading="lazy" className="size-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.album}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(s.duration)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}