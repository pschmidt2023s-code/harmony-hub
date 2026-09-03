import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  Download,
  Heart,
  History,
  ListPlus,
  LogOut,
  Package,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/Section";
import { usePlayer } from "@/components/player/player-context";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, type Song } from "@/lib/data";
import { contentQueryOptions } from "@/lib/content";
import { shopQueryOptions } from "@/lib/shop";
import { useMusicLibrary } from "@/lib/library";
import { accountQueryOptions, downloadsQueryOptions, formatMoney, ordersQueryOptions, relativeTime } from "@/lib/account";
import {
  createDownloadLink,
  toggleReleaseNotification,
  toggleWishlist,
  updateAccountProfile,
  updateNotificationPrefs,
} from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/konto")({
  head: () => ({
    meta: [
      { title: "Deine Library — TAYO Fan Zone" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Favoriten, Käufe, Downloads und Einstellungen deines TAYO Fan-Accounts." },
      { property: "og:title", content: "Deine Library — TAYO Fan Zone" },
      { property: "og:description", content: "Persönliche Musikbibliothek, Käufe und Einstellungen." },
    ],
  }),
  component: KontoPage,
});

type TabId = "library" | "kaeufe" | "downloads" | "wunschliste" | "benachrichtigungen" | "konto";

const TABS: { id: TabId; label: string }[] = [
  { id: "library", label: "Deine Library" },
  { id: "kaeufe", label: "Käufe" },
  { id: "downloads", label: "Downloads" },
  { id: "wunschliste", label: "Wunschliste" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
  { id: "konto", label: "Konto & Privatsphäre" },
];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-border/60 px-4 py-6 text-sm text-muted-foreground">{children}</p>;
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function TrackRow({ song, hint, onPlay }: { song: Song; hint?: string; onPlay: () => void }) {
  const p = usePlayer();
  return (
    <li className="glass flex items-center gap-3 rounded-2xl p-3">
      <button onClick={onPlay} aria-label={`${song.title} abspielen`} className="relative shrink-0">
        <img src={song.cover} alt="" width={160} height={160} loading="lazy" className="size-14 rounded-xl object-cover" />
        <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/50 opacity-0 transition-opacity hover:opacity-100">
          <Play className="size-5" />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <p className="truncate text-xs text-muted-foreground">{hint ?? song.album}</p>
      </div>
      <button
        onClick={() => p.addToQueue(song)}
        aria-label={`${song.title} zur Warteschlange hinzufügen`}
        className="grid min-h-11 min-w-11 place-items-center text-muted-foreground transition-colors hover:text-primary"
      >
        <ListPlus className="size-4" />
      </button>
    </li>
  );
}

function KontoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const player = usePlayer();
  const [tab, setTab] = useState<TabId>("library");
  const [page, setPage] = useState(0);

  const { data: content } = useQuery(contentQueryOptions);
  const { data: products } = useQuery(shopQueryOptions);
  const { data: account, isLoading: accountLoading, isError: accountError } = useQuery(accountQueryOptions(player.userId));
  const { data: orders } = useQuery({ ...ordersQueryOptions(player.userId, page), enabled: Boolean(player.userId) && tab === "kaeufe" });
  const { data: downloads } = useQuery({ ...downloadsQueryOptions(player.userId), enabled: Boolean(player.userId) && tab === "downloads" });
  const lib = useMusicLibrary(player.userId, player.favorites);

  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (account?.profile?.display_name != null) setDisplayName(account.profile.display_name);
  }, [account?.profile?.display_name]);

  const saveProfile = useMutation({
    mutationFn: () => updateAccountProfile({ data: { displayName } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account"] });
      toast.success("Profil gespeichert.");
    },
    onError: () => toast.error("Speichern fehlgeschlagen."),
  });

  const savePrefs = useMutation({
    mutationFn: (patch: Record<string, boolean>) => updateNotificationPrefs({ data: patch }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account"] }),
    onError: () => toast.error("Einstellung konnte nicht gespeichert werden."),
  });

  const removeWish = useMutation({
    mutationFn: (productId: string) => toggleWishlist({ data: { productId, on: false } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account"] }),
  });

  const removeNotify = useMutation({
    mutationFn: (releaseId: string) => toggleReleaseNotification({ data: { releaseId, on: false } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account"] }),
  });

  const download = useMutation({
    mutationFn: (key: string) => createDownloadLink({ data: { key } }),
    onSuccess: (res) => window.open(res.url, "_blank", "noopener"),
    onError: () => toast.error("Download nicht verfügbar."),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const playable = (content?.songs ?? []).filter((s) => !s.locked);
  const wishProducts = (products ?? []).filter((p) => (account?.wishlist ?? []).includes(p.id));
  const notifiedReleases = (content?.releases ?? []).filter((r) => (account?.releaseNotifications ?? []).includes(r.id));

  return (
    <div className="pt-32">
      <Section eyebrow="Fan Zone" title="Deine Library">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <div className="glass mb-4 rounded-2xl p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-primary" />
                {account?.profile?.display_name || account?.email || "Fan"}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{account?.email}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Favoriten", value: account?.favoriteCount ?? 0 },
                  { label: "Käufe", value: account?.orderCount ?? 0 },
                  { label: "Gemerkt", value: account?.wishlist.length ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-secondary/40 p-2">
                    <p className="text-base font-semibold">{s.value}</p>
                    <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id}
                  className={`min-h-11 shrink-0 rounded-full px-4 text-sm transition-colors lg:rounded-xl lg:text-left ${
                    tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {account?.isAdmin && (
              <Link to="/admin" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Shield className="size-4" /> Admin-Panel
              </Link>
            )}
          </aside>

          <div className="min-w-0">
            {accountError && <Empty>Deine Daten konnten gerade nicht geladen werden. Bitte lade die Seite neu.</Empty>}
            {accountLoading && !account && <Empty>Wird geladen …</Empty>}

            {tab === "library" && account && (
              <>
                {lib.isEmpty ? (
                  <Empty>
                    Noch nichts gespeichert. Starte einen Song im{" "}
                    <Link to="/musik" className="text-primary underline-offset-4 hover:underline">
                      Musikbereich
                    </Link>
                    — Favoriten und Verlauf erscheinen dann hier.
                  </Empty>
                ) : (
                  <>
                    {lib.continueListening.length > 0 && (
                      <Block icon={<RotateCcw className="size-4" />} title="Weiterhören">
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {lib.continueListening.map(({ song, position }) => (
                            <TrackRow
                              key={song.id}
                              song={song}
                              hint={`${formatTime(position)} / ${formatTime(song.duration)}`}
                              onPlay={() => {
                                player.play(song, playable);
                                player.seek(position);
                              }}
                            />
                          ))}
                        </ul>
                      </Block>
                    )}
                    {lib.favorites.length > 0 && (
                      <Block icon={<Heart className="size-4" />} title="Favoriten">
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {lib.favorites.map((song) => (
                            <TrackRow key={song.id} song={song} onPlay={() => player.play(song, lib.favorites)} />
                          ))}
                        </ul>
                      </Block>
                    )}
                    {lib.recentlyPlayed.length > 0 && (
                      <Block icon={<History className="size-4" />} title="Zuletzt gehört">
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {lib.recentlyPlayed.slice(0, 8).map((song) => (
                            <TrackRow key={song.id} song={song} onPlay={() => player.play(song, lib.recentlyPlayed)} />
                          ))}
                        </ul>
                        <Link to="/bibliothek" className="mt-4 inline-block text-sm text-primary hover:underline">
                          Alle anzeigen
                        </Link>
                      </Block>
                    )}
                  </>
                )}
              </>
            )}

            {tab === "kaeufe" && (
              <Block icon={<Package className="size-4" />} title="Meine Käufe">
                {!orders || orders.orders.length === 0 ? (
                  <Empty>Noch keine Bestellungen. Gastbestellungen ohne Login erscheinen hier nicht.</Empty>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {orders.orders.map((o) => (
                        <li key={o.id} className="glass rounded-2xl p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.createdAt).toLocaleDateString("de-DE")}
                            </p>
                          </div>
                          <ul className="mt-3 space-y-1 text-sm">
                            {o.items.map((i, idx) => (
                              <li key={`${o.id}-${idx}`} className="flex justify-between gap-3">
                                <span className="truncate">
                                  {i.qty}× {i.name}
                                  {i.variant ? ` · ${i.variant}` : ""}
                                </span>
                                {i.total != null && <span className="text-muted-foreground">{formatMoney(i.total, o.currency)}</span>}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
                            <span className="text-xs text-muted-foreground">
                              Zahlung: {o.status} · Bestellstatus: {o.fulfillment}
                            </span>
                            <span className="font-semibold">{formatMoney(o.amount, o.currency)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {orders.total > 10 && (
                      <div className="mt-4 flex gap-2">
                        <button
                          disabled={page === 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-40"
                        >
                          Zurück
                        </button>
                        <button
                          disabled={(page + 1) * 10 >= orders.total}
                          onClick={() => setPage((p) => p + 1)}
                          className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-40"
                        >
                          Weiter
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Block>
            )}

            {tab === "downloads" && (
              <Block icon={<Download className="size-4" />} title="Downloads">
                {!downloads || downloads.length === 0 ? (
                  <Empty>Keine digitalen Inhalte verfügbar. Downloads erscheinen nach einem Kauf digitaler Produkte.</Empty>
                ) : (
                  <ul className="space-y-3">
                    {downloads.map((d) => (
                      <li key={d.key} className="glass flex items-center gap-3 rounded-2xl p-3">
                        {d.cover && (
                          <img src={d.cover} alt="" width={120} height={120} loading="lazy" className="size-12 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{d.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.product}</p>
                        </div>
                        <button
                          onClick={() => download.mutate(d.key)}
                          disabled={download.isPending}
                          className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                        >
                          Laden
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
            )}

            {tab === "wunschliste" && (
              <Block icon={<Star className="size-4" />} title="Wunschliste">
                {wishProducts.length === 0 ? (
                  <Empty>
                    Noch nichts gemerkt. Im{" "}
                    <Link to="/shop" className="text-primary underline-offset-4 hover:underline">
                      Shop
                    </Link>{" "}
                    kannst du Artikel auf die Wunschliste setzen.
                  </Empty>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {wishProducts.map((p) => (
                      <li key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                        <img src={p.image} alt="" width={120} height={120} loading="lazy" className="size-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <Link to="/shop/$slug" params={{ slug: p.slug }} className="block truncate text-sm font-medium hover:text-primary">
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatMoney(p.price, p.currency)}</p>
                        </div>
                        <button
                          onClick={() => removeWish.mutate(p.id)}
                          aria-label={`${p.name} von der Wunschliste entfernen`}
                          className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
            )}

            {tab === "benachrichtigungen" && account && (
              <>
                <Block icon={<Bell className="size-4" />} title="Release-Erinnerungen">
                  {notifiedReleases.length === 0 ? (
                    <Empty>Keine Erinnerungen aktiv. Auf einer Release-Seite kannst du „Erinnere mich" aktivieren.</Empty>
                  ) : (
                    <ul className="space-y-2">
                      {notifiedReleases.map((r) => (
                        <li key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                          <img src={r.cover} alt="" width={120} height={120} loading="lazy" className="size-12 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{r.type}</p>
                          </div>
                          <button
                            onClick={() => removeNotify.mutate(r.id)}
                            className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Aus
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Block>

                <Block icon={<Bell className="size-4" />} title="Einstellungen">
                  <ul className="glass divide-y divide-border/60 rounded-2xl">
                    {[
                      { key: "notify_new_releases", label: "Neue Releases", value: account.profile?.notify_new_releases ?? true },
                      { key: "notify_release_reminders", label: "Release-Erinnerungen", value: account.profile?.notify_release_reminders ?? true },
                      { key: "notify_account", label: "Account- & Systemhinweise", value: account.profile?.notify_account ?? true },
                    ].map((row) => (
                      <li key={row.key} className="flex min-h-14 items-center justify-between gap-4 px-4">
                        <span className="text-sm">{row.label}</span>
                        <button
                          role="switch"
                          aria-checked={row.value}
                          aria-label={row.label}
                          onClick={() => savePrefs.mutate({ [row.key]: !row.value })}
                          className={`h-6 w-11 shrink-0 rounded-full transition-colors ${row.value ? "bg-primary" : "bg-secondary"}`}
                        >
                          <span
                            className={`block size-5 rounded-full bg-background transition-transform ${row.value ? "translate-x-5" : "translate-x-0.5"}`}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Der Newsletter ist davon getrennt — Status:{" "}
                    {account.newsletterStatus === "subscribed" ? "abonniert" : "nicht abonniert"}.
                  </p>
                </Block>
              </>
            )}

            {tab === "konto" && account && (
              <>
                <Block icon={<User className="size-4" />} title="Account">
                  <div className="glass rounded-2xl p-5">
                    <label htmlFor="display-name" className="text-xs text-muted-foreground">
                      Anzeigename
                    </label>
                    <input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="glass mt-2 w-full rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-3 text-xs text-muted-foreground">E-Mail: {account.email}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => saveProfile.mutate()}
                        disabled={saveProfile.isPending}
                        className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => {
                          void supabase.auth
                            .resetPasswordForEmail(account.email, { redirectTo: `${window.location.origin}/auth` })
                            .then(() => toast.success("E-Mail zum Zurücksetzen versendet."));
                        }}
                        className="min-h-11 rounded-full border border-border px-5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Passwort ändern
                      </button>
                      <button
                        onClick={signOut}
                        className="flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <LogOut className="size-4" /> Abmelden
                      </button>
                    </div>
                  </div>
                </Block>

                <Block icon={<ShieldCheck className="size-4" />} title="Privatsphäre">
                  <div className="glass space-y-2 rounded-2xl p-5 text-sm text-muted-foreground">
                    <p>Gespeichert werden: Anzeigename, E-Mail, Favoriten, Hörverlauf, Wiedergabepositionen, Wunschliste, Release-Erinnerungen und deine Bestellungen.</p>
                    <p>Alle diese Daten sind ausschließlich deinem Account zugeordnet und für andere Fans nicht sichtbar.</p>
                    <p>
                      Newsletter-Status: {account.newsletterStatus === "subscribed" ? "abonniert" : "nicht abonniert"} — separat von den
                      Release-Erinnerungen.
                    </p>
                    <p>
                      Für eine vollständige Löschung deines Accounts schreib uns über die{" "}
                      <Link to="/kontakt" className="text-primary underline-offset-4 hover:underline">
                        Kontaktseite
                      </Link>
                      .
                    </p>
                  </div>
                </Block>
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
