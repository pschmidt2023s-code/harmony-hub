import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SEO, type PublicSiteSettings } from "./seo";

/**
 * Eine einzige Einstellungsquelle (Tabelle `site_settings`, Zeile 1) — Phase 2 erweitert.
 * Die Akzent-Logik (auto/manual) bleibt unverändert bestehen.
 */
export type AccentMode = "auto" | "manual";

export type SiteSettings = PublicSiteSettings & {
  accent_mode: AccentMode;
  manual_accent: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  ...DEFAULT_SEO,
  accent_mode: "auto",
  manual_accent: "#f59e0b",
};

const COLUMNS =
  "accent_mode, manual_accent, artist_name, site_name, site_title, site_description, canonical_base_url, default_og_image, logo_url, favicon_url, default_locale, theme_color";

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["site-settings"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase.from("site_settings").select(COLUMNS).eq("id", 1).maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      accent_mode: (data.accent_mode as AccentMode) ?? "auto",
      manual_accent: data.manual_accent ?? DEFAULT_SETTINGS.manual_accent,
    };
  },
});

export async function saveSiteSettings(settings: Partial<SiteSettings>) {
  const { error } = await supabase.from("site_settings").upsert({ id: 1, ...settings }, { onConflict: "id" });
  if (error) throw error;
}
