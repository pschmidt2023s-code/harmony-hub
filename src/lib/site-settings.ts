import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccentMode = "auto" | "manual";
export type SiteSettings = { accent_mode: AccentMode; manual_accent: string };

export const DEFAULT_SETTINGS: SiteSettings = { accent_mode: "auto", manual_accent: "#f59e0b" };

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["site-settings"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("accent_mode, manual_accent")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return {
      accent_mode: (data.accent_mode as AccentMode) ?? "auto",
      manual_accent: data.manual_accent ?? DEFAULT_SETTINGS.manual_accent,
    };
  },
});

export async function saveSiteSettings(settings: SiteSettings) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, ...settings }, { onConflict: "id" });
  if (error) throw error;
}
