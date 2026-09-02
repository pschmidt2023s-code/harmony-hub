import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  FALLBACK_ACCENT,
  accentFromHex,
  applyAccent,
  extractAccentFromImage,
  readCachedAccent,
  writeCachedAccent,
} from "@/lib/accent";
import { contentQueryOptions } from "@/lib/content";
import { siteSettingsQueryOptions } from "@/lib/site-settings";
import { newestRelease } from "@/lib/release";
import type { Release } from "@/lib/data";

/** Neuestes tatsächlich veröffentlichtes Release (Datum in der Vergangenheit, Status "Veröffentlicht"). */
export function newestPublishedRelease(releases: Release[]): Release | null {
  return newestRelease(releases);
}

/**
 * Setzt die Akzent-CSS-Variablen. Rendert nichts.
 * Manuell = Adminfarbe, Automatik = dominante Farbe des neuesten Release-Covers,
 * sonst der TAYO-Fallback (Molten Amber).
 */
export function AccentProvider() {
  const { data: settings } = useQuery(siteSettingsQueryOptions);
  const { data: content } = useQuery(contentQueryOptions);

  const release = content ? newestPublishedRelease(content.releases) : null;
  const cover = release?.cover ?? null;
  const mode = settings?.accent_mode ?? "auto";
  const manual = settings?.manual_accent ?? "#f59e0b";

  useEffect(() => {
    let cancelled = false;

    if (mode === "manual") {
      applyAccent(accentFromHex(manual) ?? FALLBACK_ACCENT);
      return;
    }

    if (!cover) {
      applyAccent(FALLBACK_ACCENT);
      return;
    }

    const cached = readCachedAccent(cover);
    if (cached) {
      applyAccent(cached);
      return;
    }

    void extractAccentFromImage(cover).then((accent) => {
      if (cancelled) return;
      const next = accent ?? FALLBACK_ACCENT;
      if (accent) writeCachedAccent(cover, accent);
      applyAccent(next);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, manual, cover]);

  return null;
}
