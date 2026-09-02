/**
 * Zentrale SEO-Schicht (Phase 14).
 *
 * Es gibt bewusst nur EINE Quelle für Titel, Beschreibungen, Canonicals,
 * Open Graph und Twitter/X Cards. Die redaktionellen Standardwerte stammen aus
 * der bestehenden Tabelle `site_settings` (Phase 2) und werden zusammen mit den
 * Inhalten in derselben Serverabfrage geladen — es entsteht keine zusätzliche
 * Datenbankanfrage pro Seitenaufruf.
 */

export type PublicSiteSettings = {
  artist_name: string;
  site_name: string;
  site_title: string;
  site_description: string;
  canonical_base_url: string;
  default_og_image: string;
  logo_url: string;
  favicon_url: string;
  default_locale: string;
  theme_color: string;
};

export const DEFAULT_SEO: PublicSiteSettings = {
  artist_name: "TAYO",
  site_name: "TAYO",
  site_title: "TAYO — Offizielle Artist-Plattform",
  site_description: "Musik, Releases, Videos, Tour und Merch von TAYO. R&B, Synthpop, Pop und Trap.",
  canonical_base_url: "",
  default_og_image: "",
  logo_url: "",
  favicon_url: "",
  default_locale: "de",
  theme_color: "#0a0a0a",
};

export const LOCALES = [
  { value: "de", label: "Deutsch (de)" },
  { value: "en", label: "English (en)" },
] as const;

export function normalizeSettings(row: Partial<PublicSiteSettings> | null | undefined): PublicSiteSettings {
  const clean = Object.fromEntries(
    Object.entries(row ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
  return { ...DEFAULT_SEO, ...clean } as PublicSiteSettings;
}

const isAbsolute = (url: string) => /^https?:\/\//i.test(url);

/** Canonical/og:url: absolut, sobald eine Basis-Adresse gepflegt ist, sonst relativ. */
export function canonicalUrl(path: string, base: string | undefined) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const b = (base ?? "").trim().replace(/\/+$/, "");
  return b ? `${b}${clean === "/" ? "" : clean}` || b : clean;
}

/** Nur absolute Bild-URLs sind für Social-Previews gültig — sonst wird das Tag weggelassen. */
export function socialImage(candidate: string | null | undefined, fallback: string | undefined) {
  const pick = [candidate, fallback].find((u) => u && isAbsolute(u.trim()));
  return pick ? pick.trim() : null;
}

export type SeoMeta = { title: string; content?: string } & Record<string, string>;

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  settings?: Partial<PublicSiteSettings> | null;
  image?: string | null;
  type?: string;
  noindex?: boolean;
};

/**
 * Erzeugt einen vollständigen, doppelfreien Metadatensatz für eine öffentliche Seite.
 * Canonical wird ausschließlich hier gesetzt (nur auf Blattrouten, nie im Root).
 */
export function seoHead(input: SeoInput) {
  const s = normalizeSettings(input.settings ?? null);
  const url = canonicalUrl(input.path, s.canonical_base_url);
  const image = socialImage(input.image ?? null, s.default_og_image);

  const meta: Record<string, string>[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: s.site_name },
    { property: "og:locale", content: s.default_locale === "en" ? "en_US" : "de_DE" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }
  if (input.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });

  return {
    meta,
    links: input.noindex ? [] : [{ rel: "canonical", href: url }],
  };
}

/** JSON-LD nur aus echten, öffentlich sichtbaren Daten. */
export function jsonLd(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export const musicGroupLd = (s: PublicSiteSettings, url: string) => ({
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  name: s.artist_name,
  url,
  ...(s.logo_url && isAbsolute(s.logo_url) ? { image: s.logo_url } : {}),
  ...(s.site_description ? { description: s.site_description } : {}),
});
