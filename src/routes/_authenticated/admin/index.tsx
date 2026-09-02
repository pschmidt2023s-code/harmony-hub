import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Disc3,
  ListMusic,
  Package,
  Plus,
  ShoppingBag,
  Video as VideoIcon,
} from "lucide-react";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { contentQueryOptions } from "@/lib/content";
import { newestRelease, upcomingReleases } from "@/lib/release";
import { formatDate, type Release } from "@/lib/data";
import { adminProductsQueryOptions } from "@/lib/admin/products";
import {
  useAdminActivity,
  useAdminOrders,
  useAdminSubscribers,
} from "@/components/admin/dashboard-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const money = (v: number, c = "EUR") =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: c || "EUR" }).format(v);

function AdminDashboard() {
  const content = useQuery(contentQueryOptions);
  const products = useQuery(adminProductsQueryOptions);
  const orders = useAdminOrders();
  const subs = useAdminSubscribers();
  const activity = useAdminActivity();

  const releases = content.data?.releases ?? [];
  const current = releases.length ? newestRelease(releases) : null;
  const next = releases.length ? (upcomingReleases(releases)[0] ?? null) : null;

  return (
    <>
      <AdminPageHeader
        title="TAYO Control Center"
        description="Überblick über Releases, Katalog, Bestellungen und Fans."
      />

      {content.isLoading ? (
        <AdminSkeleton rows={2} />
      ) : content.isError ? (
        <AdminError message="Inhalte konnten nicht geladen werden." onRetry={() => void content.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <CurrentRelease release={current} />
          <NextRelease release={next} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Katalog
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CountCard
            icon={<Disc3 className="size-4" />}
            label="Releases veröffentlicht"
            value={releases.filter((r) => r.status === "Veröffentlicht").length}
            loading={content.isLoading}
            to="/admin/releases"
          />
          <CountCard
            icon={<ListMusic className="size-4" />}
            label="Songs"
            value={content.data?.songs.length ?? 0}
            loading={content.isLoading}
            to="/admin/songs"
          />
          <CountCard
            icon={<VideoIcon className="size-4" />}
            label="Videos"
            value={content.data?.videos.length ?? 0}
            loading={content.isLoading}
            to="/admin/videos"
          />
          <CountCard
            icon={<Package className="size-4" />}
            label="Produkte"
            value={products.data?.length ?? 0}
            loading={products.isLoading}
            to="/admin/products"
          />
        </div>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Letzte Aktivität">
          {activity.isLoading ? (
            <AdminSkeleton rows={3} />
          ) : activity.isError ? (
            <AdminError message="Aktivität nicht verfügbar." onRetry={() => void activity.refetch()} />
          ) : (activity.data ?? []).length === 0 ? (
            <Empty text="Keine Aktivität vorhanden." />
          ) : (
            <ul className="space-y-3">
              {activity.data!.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-foreground/90">{a.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.at).toLocaleDateString("de-DE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card
            title="Bestellungen"
            action={
              <Link to="/admin/orders" className="text-xs uppercase tracking-widest text-primary">
                Alle ansehen
              </Link>
            }
          >
            {orders.isLoading ? (
              <AdminSkeleton rows={2} />
            ) : orders.isError ? (
              <AdminError message="Bestellungen nicht verfügbar." onRetry={() => void orders.refetch()} />
            ) : (orders.data ?? []).length === 0 ? (
              <Empty text="Noch keine Bestellungen." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Gesamt" value={orders.data!.length} />
                  <MiniStat
                    label="Offen"
                    value={orders.data!.filter((o) => o.status === "created" || o.status === "pending").length}
                  />
                  <MiniStat
                    label="Bezahlt"
                    value={orders.data!.filter((o) => o.status === "paid").length}
                  />
                </div>
                <ul className="mt-4 space-y-2">
                  {orders.data!.slice(0, 3).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{o.email ?? "—"}</span>
                      <span className="shrink-0">{money(Number(o.amount), o.currency)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card
            title="Newsletter"
            action={
              <Link to="/admin/newsletter" className="text-xs uppercase tracking-widest text-primary">
                Verwalten
              </Link>
            }
          >
            {subs.isLoading ? (
              <AdminSkeleton rows={1} />
            ) : subs.isError ? (
              <AdminError message="Abonnenten nicht verfügbar." onRetry={() => void subs.refetch()} />
            ) : (
              <>
                <p className="text-3xl font-semibold">{subs.data?.length ?? 0}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Abonnenten</p>
                {(subs.data ?? []).length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {subs.data!.slice(0, 3).map((s) => (
                      <li key={s.id} className="truncate text-sm text-muted-foreground">
                        {s.email}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Schnellaktionen
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction to="/admin/releases" icon={<Disc3 className="size-4" />} label="Neues Release" />
          <QuickAction to="/admin/songs" icon={<ListMusic className="size-4" />} label="Neuer Song" />
          <QuickAction to="/admin/videos" icon={<VideoIcon className="size-4" />} label="Neues Video" />
          <QuickAction to="/admin/products" icon={<ShoppingBag className="size-4" />} label="Neues Produkt" />
        </div>
      </section>
    </>
  );
}

function CurrentRelease({ release }: { release: Release | null }) {
  if (!release) {
    return (
      <Card title="Aktuelles Release">
        <Empty text="Kein Release veröffentlicht." />
        <Link
          to="/admin/releases"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground"
        >
          <Plus className="size-3.5" /> Release anlegen
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Aktuelles Release">
      <div className="flex flex-col gap-5 sm:flex-row">
        <img
          src={release.cover}
          alt={`Cover ${release.title}`}
          className="size-28 shrink-0 rounded-2xl object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
            {release.type} · {release.status}
          </p>
          <p className="mt-1 truncate text-xl font-semibold">{release.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(release.date)} · {release.tracks} Tracks
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/releases/$slug"
              params={{ slug: release.slug }}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-foreground"
            >
              Ansehen
            </Link>
            <Link
              to="/admin/releases"
              className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Bearbeiten
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function NextRelease({ release }: { release: Release | null }) {
  if (!release) {
    return (
      <Card title="Nächstes Release">
        <Empty text="Kein kommendes Release." />
        <Link
          to="/admin/releases"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" /> Release anlegen
        </Link>
      </Card>
    );
  }

  const days = Math.max(
    0,
    Math.ceil(
      (new Date(`${release.date}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <Card title="Nächstes Release">
      <div className="flex gap-4">
        <img
          src={release.cover}
          alt={`Cover ${release.title}`}
          className="size-16 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{release.title}</p>
          <p className="text-sm text-muted-foreground">{formatDate(release.date)}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-primary">
            {release.status} · in {days} Tagen
          </p>
        </div>
      </div>
    </Card>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-border/60 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CountCard({
  icon,
  label,
  value,
  loading,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  to: "/admin/releases" | "/admin/songs" | "/admin/videos" | "/admin/products";
}) {
  return (
    <Link
      to={to}
      className="glass rounded-2xl border border-border/60 p-4 transition-colors hover:border-primary/40"
    >
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">
        {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-foreground/10" /> : value}
      </p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/50 py-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: "/admin/releases" | "/admin/songs" | "/admin/videos" | "/admin/products";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      {icon} {label}
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
