import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, saveSiteSettings, siteSettingsQueryOptions } from "@/lib/site-settings";
import { canonicalUrl } from "@/lib/seo";
import { CounterHint, Field, ImageField, SaveBar, inputClass } from "@/components/admin/settings/fields";

type Draft = {
  site_title: string;
  site_description: string;
  canonical_base_url: string;
  default_og_image: string;
};

const toDraft = (s: typeof DEFAULT_SETTINGS): Draft => ({
  site_title: s.site_title,
  site_description: s.site_description,
  canonical_base_url: s.canonical_base_url,
  default_og_image: s.default_og_image,
});

const isAbsolute = (v: string) => /^https?:\/\//i.test(v.trim());

export function SeoDefaults() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(siteSettingsQueryOptions);
  const [draft, setDraft] = useState<Draft>(toDraft(DEFAULT_SETTINGS));

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const base = useMemo(() => toDraft(data ?? DEFAULT_SETTINGS), [data]);
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const baseUrlInvalid = draft.canonical_base_url.trim() !== "" && !isAbsolute(draft.canonical_base_url);
  const imageInvalid = draft.default_og_image.trim() !== "" && !isAbsolute(draft.default_og_image);

  const save = useMutation({
    mutationFn: () =>
      saveSiteSettings({
        site_title: draft.site_title.trim() || DEFAULT_SETTINGS.site_title,
        site_description: draft.site_description.trim() || DEFAULT_SETTINGS.site_description,
        canonical_base_url: draft.canonical_base_url.trim().replace(/\/+$/, ""),
        default_og_image: draft.default_og_image.trim(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
      void qc.invalidateQueries({ queryKey: ["content"] });
      toast.success("SEO-Standards gespeichert");
    },
    onError: (e: Error) => toast.error(e.message || "Speichern fehlgeschlagen"),
  });

  if (isLoading) return <div className="glass h-72 animate-pulse rounded-2xl" />;
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-destructive">
        SEO-Einstellungen konnten nicht geladen werden.
      </div>
    );
  }

  const previewUrl = canonicalUrl("/", draft.canonical_base_url) || "/";

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <p className="text-sm font-semibold">Standard-Metadaten</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Gelten für die Startseite und als Rückfallwert überall dort, wo eine Seite keine eigenen Angaben hat.
          Releases, Songs, Videos und Produkte haben eigene SEO-Felder in ihren Editoren.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Standard-Titel">
            <input
              className={inputClass}
              value={draft.site_title}
              maxLength={120}
              onChange={(e) => set("site_title", e.target.value)}
            />
            <div className="mt-1.5">
              <CounterHint value={draft.site_title} max={60} label="Titel" />
            </div>
          </Field>
          <Field label="Canonical-Basisadresse" hint="Leer lassen, solange keine feste Domain besteht — dann werden relative Adressen verwendet.">
            <input
              className={inputClass}
              value={draft.canonical_base_url}
              placeholder="https://beispiel.de"
              onChange={(e) => set("canonical_base_url", e.target.value)}
            />
            {baseUrlInvalid && (
              <span className="mt-1.5 block text-xs text-destructive">
                Bitte eine vollständige Adresse mit https:// angeben.
              </span>
            )}
          </Field>
          <div className="md:col-span-2">
            <Field label="Standard-Beschreibung">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={draft.site_description}
                maxLength={320}
                onChange={(e) => set("site_description", e.target.value)}
              />
              <div className="mt-1.5">
                <CounterHint value={draft.site_description} max={160} label="Beschreibung" />
              </div>
            </Field>
          </div>
          <div className="md:col-span-2">
            <ImageField
              label="Standard-Vorschaubild"
              hint="Nur absolute Adressen (https://…) werden von sozialen Netzwerken akzeptiert. Empfohlen: 1200×630 px."
              value={draft.default_og_image}
              onChange={(v) => set("default_og_image", v)}
            />
            {imageInvalid && (
              <span className="mt-1.5 block text-xs text-destructive">
                Diese Adresse ist nicht absolut — das Vorschaubild wird dann nicht ausgeliefert.
              </span>
            )}
          </div>
        </div>

        <SaveBar dirty={dirty} saving={save.isPending} onSave={() => save.mutate()} onReset={() => setDraft(base)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm font-semibold">Vorschau: Suchergebnis</p>
          <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="truncate text-xs text-muted-foreground">{previewUrl}</p>
            <p className="mt-1 line-clamp-1 text-base text-primary">{draft.site_title || "—"}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{draft.site_description || "—"}</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-sm font-semibold">Vorschau: Social Card</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-background/40">
            <div className="aspect-[1200/630] w-full bg-muted/30">
              {isAbsolute(draft.default_og_image) ? (
                <img
                  src={draft.default_og_image}
                  alt="Vorschaubild"
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center px-6 text-center text-xs text-muted-foreground">
                  Kein absolutes Vorschaubild gesetzt — Netzwerke zeigen dann nur Text.
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="line-clamp-1 text-sm font-semibold">{draft.site_title || "—"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{draft.site_description || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
