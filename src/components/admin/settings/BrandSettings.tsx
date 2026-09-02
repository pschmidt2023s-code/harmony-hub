import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, saveSiteSettings, siteSettingsQueryOptions } from "@/lib/site-settings";
import { LOCALES } from "@/lib/seo";
import { Field, ImageField, SaveBar, inputClass } from "./fields";

type Draft = {
  artist_name: string;
  site_name: string;
  default_locale: string;
  theme_color: string;
  logo_url: string;
  favicon_url: string;
};

const toDraft = (s: typeof DEFAULT_SETTINGS): Draft => ({
  artist_name: s.artist_name,
  site_name: s.site_name,
  default_locale: s.default_locale,
  theme_color: s.theme_color,
  logo_url: s.logo_url,
  favicon_url: s.favicon_url,
});

export function BrandSettings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(siteSettingsQueryOptions);
  const [draft, setDraft] = useState<Draft>(toDraft(DEFAULT_SETTINGS));

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const base = useMemo(() => toDraft(data ?? DEFAULT_SETTINGS), [data]);
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      saveSiteSettings({
        artist_name: draft.artist_name.trim() || DEFAULT_SETTINGS.artist_name,
        site_name: draft.site_name.trim() || DEFAULT_SETTINGS.site_name,
        default_locale: draft.default_locale,
        theme_color: draft.theme_color,
        logo_url: draft.logo_url.trim(),
        favicon_url: draft.favicon_url.trim(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
      void qc.invalidateQueries({ queryKey: ["content"] });
      toast.success("Einstellungen gespeichert");
    },
    onError: (e: Error) => toast.error(e.message || "Speichern fehlgeschlagen"),
  });

  if (isLoading) {
    return <div className="glass h-64 animate-pulse rounded-2xl" />;
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-destructive">
        Einstellungen konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-sm font-semibold">Allgemein & Branding</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Diese Werte gelten für die gesamte Website und werden in Metadaten, Sharing-Vorschauen und im Browser-Tab
        verwendet.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Artist-Name" hint="Wird in Titeln, Strukturdaten und Vorschauen verwendet.">
          <input
            className={inputClass}
            value={draft.artist_name}
            maxLength={80}
            onChange={(e) => set("artist_name", e.target.value)}
          />
        </Field>
        <Field label="Site-Name" hint="Name der Website für og:site_name.">
          <input
            className={inputClass}
            value={draft.site_name}
            maxLength={80}
            onChange={(e) => set("site_name", e.target.value)}
          />
        </Field>
        <Field label="Standardsprache">
          <select
            className={inputClass}
            value={draft.default_locale}
            onChange={(e) => set("default_locale", e.target.value)}
          >
            {LOCALES.map((l: { value: string; label: string }) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Theme-Farbe" hint="Browser-/PWA-Farbe. Die Akzentfarbe bleibt davon unberührt.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft.theme_color}
              onChange={(e) => set("theme_color", e.target.value)}
              aria-label="Theme-Farbe"
              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <input
              className={`${inputClass} w-32`}
              value={draft.theme_color}
              onChange={(e) => set("theme_color", e.target.value)}
            />
          </div>
        </Field>
        <ImageField
          label="Logo"
          hint="Optional. Wird für Strukturdaten und Branding verwendet."
          value={draft.logo_url}
          onChange={(v) => set("logo_url", v)}
        />
        <ImageField
          label="Favicon"
          hint="Optional. Quadratisches Bild, mindestens 180×180 px."
          value={draft.favicon_url}
          onChange={(v) => set("favicon_url", v)}
        />
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={() => save.mutate()}
        onReset={() => setDraft(base)}
      />
    </div>
  );
}
