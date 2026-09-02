/**
 * Dynamisches Akzentfarben-System.
 *
 * Ablauf: Cover des neuesten veröffentlichten Releases -> dominante Farbe
 * extrahieren (Histogramm über Farbton-Buckets, neutrale/zu dunkle/zu helle
 * Pixel werden ignoriert) -> in OKLCH umrechnen -> Helligkeit/Chroma auf einen
 * UI-tauglichen Bereich begrenzen -> als CSS-Variablen setzen.
 */

export type AccentOklch = { l: number; c: number; h: number };

/** TAYO Fallback: Molten Amber (#f59e0b) */
export const FALLBACK_ACCENT: AccentOklch = { l: 0.78, c: 0.16, h: 68 };

/* ------------------------------ Farbmathematik ----------------------------- */

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

export function rgbToOklch(r: number, g: number, b: number): AccentOklch {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let v = m[1]!;
  if (v.length === 3) v = v.split("").map((ch) => ch + ch).join("");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** Begrenzt eine extrahierte Farbe auf einen auf Schwarz lesbaren, premium wirkenden Bereich. */
export function normalizeAccent({ l, c, h }: AccentOklch): AccentOklch {
  return {
    l: Math.min(0.86, Math.max(0.66, l)),
    c: Math.min(0.19, Math.max(0.08, c)),
    h,
  };
}

export function accentFromHex(hex: string): AccentOklch | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return normalizeAccent(rgbToOklch(rgb[0], rgb[1], rgb[2]));
}

/* ------------------------------- Extraktion -------------------------------- */

const BUCKETS = 24; // 15° pro Farbton-Bucket

/** Dominante, als UI-Akzent geeignete Farbe aus einem Bild. Läuft nur im Browser. */
export async function extractAccentFromImage(src: string): Promise<AccentOklch | null> {
  if (typeof document === "undefined") return null;

  const img = await loadImage(src);
  if (!img) return null;

  const size = 48; // stark herunterskaliert -> schnelle Analyse
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // getaintetes Canvas (fehlendes CORS) -> Fallback
  }

  const bins = Array.from({ length: BUCKETS }, () => ({ weight: 0, l: 0, c: 0, sin: 0, cos: 0 }));

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;
    if (alpha < 128) continue;
    const { l, c, h } = rgbToOklch(data[i]!, data[i + 1]!, data[i + 2]!);
    // Neutrale, fast schwarze und fast weiße Pixel taugen nicht als Akzent.
    if (c < 0.045 || l < 0.18 || l > 0.94) continue;
    const bin = bins[Math.floor(h / (360 / BUCKETS)) % BUCKETS]!;
    // Sättigung stärker gewichten: kräftige Bereiche prägen den Look.
    const w = c * c * 100;
    bin.weight += w;
    bin.l += l * w;
    bin.c += c * w;
    bin.sin += Math.sin((h * Math.PI) / 180) * w;
    bin.cos += Math.cos((h * Math.PI) / 180) * w;
  }

  let best = bins[0]!;
  for (const b of bins) if (b.weight > best.weight) best = b;
  if (best.weight <= 0) return null;

  let hue = (Math.atan2(best.sin / best.weight, best.cos / best.weight) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return normalizeAccent({ l: best.l / best.weight, c: best.c / best.weight, h: hue });
}

function loadImage(src: string, cors = true): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    // Ohne CORS-Header schlägt der anonyme Ladeversuch fehl -> einmal ohne probieren.
    img.onerror = () => (cors ? loadImage(src, false).then(resolve) : resolve(null));
    img.src = src;
  });
}

/* --------------------------- Anwenden & Caching ---------------------------- */

export function applyAccent(accent: AccentOklch) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent-l", accent.l.toFixed(4));
  root.style.setProperty("--accent-c", accent.c.toFixed(4));
  root.style.setProperty("--accent-h", accent.h.toFixed(2));
}

const CACHE_PREFIX = "tayo-accent:";

export function readCachedAccent(key: string): AccentOklch | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccentOklch;
    if (typeof parsed.l !== "number" || typeof parsed.c !== "number" || typeof parsed.h !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedAccent(key: string, accent: AccentOklch) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(accent));
  } catch {
    /* Speicher voll oder gesperrt – Cache ist optional */
  }
}
