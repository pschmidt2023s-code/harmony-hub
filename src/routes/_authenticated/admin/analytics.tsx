import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  RANGES,
  activityQueryOptions,
  audienceQueryOptions,
  buildSeries,
  catalogStatsQueryOptions,
  commerceQueryOptions,
  downloadCsv,
  rangeBucket,
  rangeLabel,
  releasePerformanceQueryOptions,
  type RangeValue,
} from "@/lib/admin/analytics";
import { money } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

/* ------------------------------ Bausteine --------------------------------- */

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">{title}</h2>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-6">
      <p className="text-sm font-semibold">{title} — Nicht verfügbar</p>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">{text}</p>;
}

const ACCENT = "var(--accent-base)";

function chartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "oklch(1 0 0 / 6%)" }}
      contentStyle={{
        background: "oklch(0.16 0.006 65)",
        border: "1px solid oklch(1 0 0 / 12%)",
        borderRadius: 12,
        fontSize: 12,
      }}
      labelStyle={{ color: "oklch(0.85 0 0)" }}
    />
  );
}

/* --------------------------------- Seite ---------------------------------- */

function AnalyticsPage() {
  const [range, setRange] = useState<RangeValue>("30d");
  const [topTab, setTopTab] = useState<"Songs" | "Releases" | "Videos" | "Produkte">("Produkte");

  const catalog = useQuery(catalogStatsQueryOptions);
  const commerce = useQuery(commerceQueryOptions(range));
  const audience = useQuery(audienceQueryOptions(range));
  const releases = useQuery(releasePerformanceQueryOptions);
  const activity = useQuery(activityQueryOptions(range));

  const series = useMemo(
    () =>
      commerce.data && audience.data
        ? buildSeries(range, commerce.data.orders, audience.data.signups)
        : [],
    [commerce.data, audience.data, range],
  );

  const currency = commerce.data?.currency ?? "EUR";
  const hasOrders = (commerce.data?.total ?? 0) > 0;
  const hasSignups = (audience.data?.signups.length ?? 0) > 0;
  const loading = catalog.isLoading || commerce.isLoading || audience.isLoading;
  const error = catalog.error ?? commerce.error ?? audience.error ?? releases.error ?? activity.error;

  return (
    <>
      <AdminPageHeader
        title="Artist Intelligence"
        description="Ausschließlich echte Daten aus dem eigenen System. Nicht gemessene Kennzahlen werden als nicht verfügbar ausgewiesen."
        action={
          <div className="flex flex-wrap gap-1 rounded-full border border-border/60 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                  range === r.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {error && <AdminError message={(error as Error).message ?? "Daten konnten nicht geladen werden."} />}
      {loading && !error && <AdminSkeleton rows={4} />}

      {!loading && !error && (
        <>
          {/* A. Überblick */}
          <Section title="Überblick" hint="Katalogzahlen sind Gesamtbestände (zeitraumunabhängig).">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <Kpi label="Releases veröffentlicht" value={String(catalog.data?.releases.published ?? 0)} note={`von ${catalog.data?.releases.total ?? 0}`} />
              <Kpi label="Songs veröffentlicht" value={String(catalog.data?.songs.published ?? 0)} note={`von ${catalog.data?.songs.total ?? 0}`} />
              <Kpi label="Videos veröffentlicht" value={String(catalog.data?.videos.published ?? 0)} note={`von ${catalog.data?.videos.total ?? 0}`} />
              <Kpi label="Produkte veröffentlicht" value={String(catalog.data?.products.published ?? 0)} note={`von ${catalog.data?.products.total ?? 0}`} />
              <Kpi label="Registrierte Fans" value={String(audience.data?.fans ?? 0)} note="Gesamt" />
              <Kpi label="Newsletter-Abonnenten" value={String(audience.data?.subscribers ?? 0)} note="Gesamt, Status angemeldet" />
              <Kpi label={`Bestellungen (${rangeLabel(range)})`} value={String(commerce.data?.total ?? 0)} />
              <Kpi label={`Bezahlte Bestellungen (${rangeLabel(range)})`} value={String(commerce.data?.paid ?? 0)} />
              <Kpi
                label={`Bestellwert bezahlt (${rangeLabel(range)})`}
                value={money(commerce.data?.grossValue ?? 0, currency)}
              />
            </div>
          </Section>

          {/* Charts */}
          <Section
            title="Verlauf"
            hint={`Zeitraum ${rangeLabel(range)} · ${rangeBucket(range) === "month" ? "Monatswerte" : "Tageswerte"} · Zeitstempel in UTC`}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass rounded-2xl border border-border/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">Bestellungen & Bestellwert</p>
                {hasOrders ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                        {chartTooltip()}
                        <Area
                          type="monotone"
                          dataKey="orders"
                          name="Bestellungen"
                          stroke={ACCENT}
                          fill="url(#ordersFill)"
                          strokeWidth={2}
                          dot={series.length === 1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty text="Keine Bestellungen im gewählten Zeitraum." />
                )}
              </div>

              <div className="glass rounded-2xl border border-border/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">Newsletter-Anmeldungen</p>
                {hasSignups ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                        {chartTooltip()}
                        <Bar dataKey="signups" name="Anmeldungen" fill={ACCENT} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty text="Keine Newsletter-Anmeldungen im gewählten Zeitraum." />
                )}
              </div>
            </div>
          </Section>

          {/* B. Content Performance */}
          <Section title="Content Performance" hint="Reichweitenmessung ist im System aktuell nicht implementiert.">
            <div className="grid gap-3 md:grid-cols-2">
              <Unavailable
                title="Plays, Views & Downloads"
                reason="Es existiert kein Event-Tracking für Player, Seitenaufrufe oder Downloads. Es werden bewusst keine Zahlen geschätzt."
              />
              <Unavailable
                title="Meistfavorisierte Songs"
                reason="Favoriten sind laut Zugriffsregeln ausschließlich für die jeweiligen Nutzerinnen und Nutzer lesbar. Eine Auswertung im Admin ist ohne Änderung der Zugriffsregeln nicht möglich."
              />
              <Unavailable
                title="Streams externer Plattformen"
                reason="Es besteht keine Verbindung zu Spotify, Apple Music, YouTube oder Social-Plattformen. Solche Zahlen liegen dem System nicht vor."
              />
            </div>
          </Section>

          {/* C. Commerce */}
          <Section
            title="Commerce"
            hint={`Echte Bestelldaten · Zeitraum ${rangeLabel(range)} · Zahlungsstatus und Bearbeitungsstatus bleiben getrennt`}
            action={
              hasOrders ? (
                <button
                  onClick={() =>
                    downloadCsv(
                      `tayo-bestellungen-${range}.csv`,
                      (commerce.data?.orders ?? []).map((o) => ({
                        bestellnummer: `#${o.id.slice(0, 8).toUpperCase()}`,
                        datum: o.created_at,
                        zahlungsstatus: o.status,
                        bearbeitung: o.fulfillment_status ?? "",
                        betrag: Number(o.amount).toFixed(2),
                        waehrung: o.currency,
                      })),
                    )
                  }
                  className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  Export CSV
                </button>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Kpi label="Bestellungen" value={String(commerce.data?.total ?? 0)} />
              <Kpi label="Bezahlt" value={String(commerce.data?.paid ?? 0)} />
              <Kpi label="Erstattet" value={String(commerce.data?.refunded ?? 0)} />
              <Kpi label="Storniert" value={String(commerce.data?.cancelled ?? 0)} note="Bearbeitungsstatus" />
              <Kpi label="Ø Bestellwert" value={money(commerce.data?.avgOrderValue ?? 0, currency)} note="nur bezahlte" />
              <Kpi label="Verkaufte Artikel" value={String(commerce.data?.itemsSold ?? 0)} note="nur bezahlte" />
            </div>
            {commerce.data?.truncated && (
              <p className="mt-3 text-xs text-muted-foreground">
                Hinweis: Es werden maximal 2.000 Bestellungen je Zeitraum ausgewertet. Für ältere Zahlen bitte den Zeitraum einschränken.
              </p>
            )}
          </Section>

          {/* Top Content */}
          <Section title="Top Content" hint="Rangfolgen nur dort, wo echte Messwerte existieren.">
            <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border/60 p-1 sm:w-fit">
              {(["Produkte", "Songs", "Releases", "Videos"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopTab(t)}
                  className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                    topTab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {topTab === "Produkte" ? (
              (commerce.data?.bestSellers.length ?? 0) > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                      <tr>
                        <th className="p-3">Produkt</th>
                        <th className="p-3 text-right">Menge</th>
                        <th className="p-3 text-right">Umsatz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commerce.data?.bestSellers.map((b) => (
                        <tr key={b.name} className="border-t border-border/50">
                          <td className="p-3">{b.name}</td>
                          <td className="p-3 text-right tabular-nums">{b.qty}</td>
                          <td className="p-3 text-right tabular-nums">{money(b.value, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="Keine bezahlten Bestellpositionen im gewählten Zeitraum." />
              )
            ) : (
              <Empty text="Keine Trackingdaten vorhanden — Plays, Aufrufe und Downloads werden derzeit nicht gemessen." />
            )}
          </Section>

          {/* D. Audience */}
          <Section title="Audience" hint="Fan-Konto, Newsletter-Abo und Kundenstatus bleiben getrennte Datensätze.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <Kpi label="Registrierte Fans" value={String(audience.data?.fans ?? 0)} />
              <Kpi label="Kunden" value={String(audience.data?.customers ?? 0)} note="mit mindestens einer Bestellung" />
              <Kpi label="Newsletter angemeldet" value={String(audience.data?.subscribers ?? 0)} />
              <Kpi label="Newsletter abgemeldet" value={String(audience.data?.unsubscribed ?? 0)} />
              <Kpi
                label="Kunden mit Newsletter"
                value={
                  audience.data?.customersWithNewsletter === null || audience.data?.customersWithNewsletter === undefined
                    ? "Nicht verfügbar"
                    : String(audience.data.customersWithNewsletter)
                }
                note={audience.data?.customersWithNewsletter === null ? "zu viele Kunden für eine Sofortauswertung" : undefined}
              />
            </div>
          </Section>

          {/* E. Release Performance */}
          <Section
            title="Release Performance"
            hint="Nur Kennzahlen, die im System tatsächlich vorliegen. Plays und Seitenaufrufe werden nicht gemessen."
            action={
              (releases.data?.length ?? 0) > 0 ? (
                <button
                  onClick={() =>
                    downloadCsv(
                      "tayo-release-performance.csv",
                      (releases.data ?? []).map((r) => ({
                        titel: r.title,
                        typ: r.type,
                        releasedatum: r.release_date,
                        tracks: r.tracks,
                        songs: r.songs,
                        videos: r.videos,
                        produkte: r.products,
                      })),
                    )
                  }
                  className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  Export CSV
                </button>
              ) : undefined
            }
          >
            {releases.isLoading ? (
              <AdminSkeleton rows={2} />
            ) : (releases.data?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="p-3">Release</th>
                      <th className="p-3">Typ</th>
                      <th className="p-3">Datum</th>
                      <th className="p-3 text-right">Tracks</th>
                      <th className="p-3 text-right">Songs</th>
                      <th className="p-3 text-right">Videos</th>
                      <th className="p-3 text-right">Produkte</th>
                      <th className="p-3 text-right">Plays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releases.data?.map((r) => (
                      <tr key={r.id} className="border-t border-border/50">
                        <td className="p-3 font-medium">{r.title}</td>
                        <td className="p-3 text-muted-foreground">{r.type}</td>
                        <td className="p-3 tabular-nums text-muted-foreground">
                          {new Date(`${r.release_date}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" })}
                        </td>
                        <td className="p-3 text-right tabular-nums">{r.tracks}</td>
                        <td className="p-3 text-right tabular-nums">{r.songs}</td>
                        <td className="p-3 text-right tabular-nums">{r.videos}</td>
                        <td className="p-3 text-right tabular-nums">{r.products}</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">Nicht verfügbar</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="Keine veröffentlichten Releases vorhanden." />
            )}
          </Section>

          {/* Aktivität */}
          <Section title="Letzte Aktivität" hint={`Echte Zeitstempel · Zeitraum ${rangeLabel(range)}`}>
            {activity.isLoading ? (
              <AdminSkeleton rows={2} />
            ) : (activity.data?.length ?? 0) > 0 ? (
              <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
                {activity.data?.map((a, i) => (
                  <li key={`${a.at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{a.kind}</span>
                      <span className="ml-3 break-all">{a.label}</span>
                      {a.detail && <span className="ml-2 text-muted-foreground">{a.detail}</span>}
                    </span>
                    <time className="text-xs tabular-nums text-muted-foreground">
                      {new Date(a.at).toLocaleString("de-DE", { timeZone: "UTC" })} UTC
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Keine Aktivität im gewählten Zeitraum." />
            )}
          </Section>

          {/* Datenquellen */}
          <Section title="Datenquellen" hint="Transparenz darüber, woher jede Zahl stammt.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="glass rounded-2xl border border-border/60 p-5 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Direkt gemessen</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Bestellungen, Bestellwert, Positionen</li>
                  <li>Newsletter-Anmeldungen und Einwilligungszeitpunkte</li>
                  <li>Registrierungen von Fan-Konten</li>
                  <li>Veröffentlichungszeitpunkte von Inhalten</li>
                </ul>
              </div>
              <div className="glass rounded-2xl border border-border/60 p-5 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aus Bestand berechnet</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Ø Bestellwert, verkaufte Artikel, Bestseller</li>
                  <li>Kunden und Kunden mit Newsletter</li>
                  <li>Songs, Videos und Produkte je Release</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-dashed border-border/60 p-5 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aktuell nicht verfügbar</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Plays, Seitenaufrufe, Downloads (kein Tracking)</li>
                  <li>Favoriten-Rangfolgen (nur nutzereigen lesbar)</li>
                  <li>Spotify, Apple Music, YouTube, Social (keine Anbindung)</li>
                  <li>Besucher- und Sitzungsdaten (nicht erhoben)</li>
                </ul>
              </div>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
