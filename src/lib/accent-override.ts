/**
 * Erlaubt einzelnen Seiten (z. B. der Release-Landingpage), das globale
 * Akzent-System aus Phase 2 vorübergehend auf ein anderes Cover umzustellen.
 * Es bleibt EIN Farbsystem: hier wird nur die Bildquelle überschrieben,
 * Extraktion, Normalisierung und Caching laufen weiterhin über `@/lib/accent`.
 */
import { useEffect, useSyncExternalStore } from "react";

let override: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeAccentOverride(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getAccentOverride() {
  return override;
}

export function useAccentOverride() {
  return useSyncExternalStore(
    subscribeAccentOverride,
    getAccentOverride,
    () => null,
  );
}

/** Setzt den Akzent für die Lebensdauer der Komponente auf ein bestimmtes Cover. */
export function useAccentSource(cover: string | null | undefined) {
  useEffect(() => {
    override = cover ?? null;
    emit();
    return () => {
      override = null;
      emit();
    };
  }, [cover]);
}
