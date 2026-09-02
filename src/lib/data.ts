import merchHoodie from "@/assets/merch-hoodie.jpg";
import merchVinyl from "@/assets/merch-vinyl.jpg";
import merchCap from "@/assets/merch-cap.jpg";

export const ARTIST = {
  name: "TAYO",
  tagline: "R&B · Synthpop · Pop · Trap",
  bio: "TAYO verbindet warmen R&B-Gesang mit kalten Synthflächen und Trap-Drums. Zwischen Berliner Nächten und analogen Synthesizern entsteht ein Sound, der gleichzeitig intim und überlebensgroß klingt.",
};

export type Song = {
  id: string;
  title: string;
  album: string;
  type: "Single" | "EP" | "Album";
  cover: string;
  duration: number;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  songwriter: string;
  producer: string;
  isrc: string;
  explicit: boolean;
  links: { spotify: string; apple: string; youtube: string; amazon: string; deezer: string };
  lyrics: { time: number; line: string }[];
};

export type ReleaseStatus =
  | "Entwurf"
  | "Idee"
  | "In Produktion"
  | "Mixing"
  | "Mastering"
  | "Geplant"
  | "Vorbestellung"
  | "Veröffentlicht"
  | "Archiviert";

/** Frei definierbare Credit-Zeile eines Releases. */
export type ReleaseCredit = { role: string; names: string };

export type Release = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  type: "Single" | "EP" | "Album" | "Deluxe" | "Mixtape";
  cover: string;
  date: string;
  publishAt: string | null;
  status: ReleaseStatus;
  description: string;
  shortDescription: string;
  explicit: boolean;
  links: Record<string, string>;
  credits: ReleaseCredit[];
  videoId: string | null;
  seoTitle: string;
  seoDescription: string;
  tracks: number;
  /** Serverseitig berechnete öffentliche Sichtbarkeit. */
  isPublic: boolean;
  updatedAt: string | null;
};


export type Video = {
  id: string;
  title: string;
  category: "Musikvideo" | "Visualizer" | "Lyric Video" | "Live" | "Behind the Scenes" | "Short";
  thumb: string;
  date: string;
  views: string;
  song: string;
};

export type Product = {
  id: string;
  name: string;
  category: "Apparel" | "Music" | "Accessoires" | "Bundle";
  price: number;
  image: string;
  variants: string[];
  badge?: string;
  stock: number;
};

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Midnight Gold Hoodie", category: "Apparel", price: 89, image: merchHoodie, variants: ["S", "M", "L", "XL"], badge: "Limited", stock: 42 },
  { id: "p2", name: "Afterglow Vinyl (Gold)", category: "Music", price: 34, image: merchVinyl, variants: ["180g"], badge: "Pre-Order", stock: 120 },
  { id: "p3", name: "TAYO Cap Embroidered", category: "Accessoires", price: 39, image: merchCap, variants: ["One Size"], stock: 88 },
  { id: "p4", name: "Vinyl + Hoodie Bundle", category: "Bundle", price: 109, image: merchHoodie, variants: ["S", "M", "L", "XL"], badge: "Save 20%", stock: 25 },
];

export const TOUR = [
  { date: "2026-09-18", city: "Berlin", venue: "Kesselhaus", status: "Ausverkauft" },
  { date: "2026-09-22", city: "Hamburg", venue: "Uebel & Gefährlich", status: "Tickets" },
  { date: "2026-09-27", city: "Köln", venue: "Gebäude 9", status: "Tickets" },
  { date: "2026-10-04", city: "München", venue: "Strom", status: "Tickets" },
  { date: "2026-10-11", city: "Wien", venue: "Flex", status: "Wenige Tickets" },
  { date: "2026-10-18", city: "Zürich", venue: "Mascotte", status: "Tickets" },
];

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
/** Social-Profile des Artists. URL leer lassen, solange kein Profil hinterlegt ist. */
export const SOCIAL_LINKS: { id: "instagram" | "youtube" | "tiktok"; label: string; url: string }[] = [
  { id: "instagram", label: "Instagram", url: "" },
  { id: "youtube", label: "YouTube", url: "" },
  { id: "tiktok", label: "TikTok", url: "" },
];
