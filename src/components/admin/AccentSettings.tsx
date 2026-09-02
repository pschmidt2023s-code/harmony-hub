import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SETTINGS,
  saveSiteSettings,
  siteSettingsQueryOptions,
  type AccentMode,
} from "@/lib/site-settings";
import { contentQueryOptions } from "@/lib/content";
import { newestPublishedRelease } from "@/components/AccentProvider";
import { cn } from "@/lib/utils";

export function AccentSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(siteSettingsQueryOptions);
  const { data: content } = useQuery(contentQueryOptions);
  const release = content ? newestPublishedRelease(content.releases) : null;

  const [mode, setMode] = useState<AccentMode>(DEFAULT_SETTINGS.accent_mode);
  const [color, setColor] = useState(DEFAULT_SETTINGS.manual_accent);

  useEffect(() => {
    if (!settings) return;
    setMode(settings.accent_mode);
    setColor(settings.manual_accent);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => saveSiteSettings({ accent_mode: mode, manual_accent: color }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Akzentfarbe gespeichert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Palette className="size-4 text-primary" /> Akzentfarbe
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Automatik übernimmt die dominante Farbe des Covers vom neuesten veröffentlichten Release
        {release ? ` (${release.title})` : " — aktuell keins, es gilt der TAYO-Fallback"}.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["auto", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-xs transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "auto" ? "Automatisch" : "Manuell"}
          </button>
        ))}
      </div>

      {mode === "manual" && (
        <div className="mt-4 flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="size-10 cursor-pointer rounded-lg border border-border bg-transparent"
            aria-label="Manuelle Akzentfarbe"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-5 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {save.isPending ? "Speichert…" : "Speichern"}
      </button>
    </div>
  );
}
