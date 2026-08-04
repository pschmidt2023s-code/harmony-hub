import coverMidnight from "@/assets/cover-midnight.jpg";
import coverNeon from "@/assets/cover-neon.jpg";
import coverSmoke from "@/assets/cover-smoke.jpg";
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

const links = {
  spotify: "https://open.spotify.com",
  apple: "https://music.apple.com",
  youtube: "https://youtube.com",
  amazon: "https://music.amazon.com",
  deezer: "https://deezer.com",
};

export const SONGS: Song[] = [
  {
    id: "midnight-gold",
    title: "Midnight Gold",
    album: "MIDNIGHT GOLD",
    type: "Single",
    cover: coverMidnight,
    duration: 212,
    genre: "R&B / Synthpop",
    bpm: 92,
    key: "F# Minor",
    mood: "Warm · Nocturnal",
    songwriter: "TAYO, L. Marek",
    producer: "NOVUM",
    isrc: "DEA621900101",
    explicit: false,
    links,
    lyrics: [
      { time: 0, line: "Neon auf der Haut, die Stadt hält den Atem an" },
      { time: 12, line: "Wir fahren durch den Regen, keiner sagt ein Wort" },
      { time: 26, line: "Midnight gold, alles glänzt wenn du gehst" },
      { time: 40, line: "Midnight gold, und ich bleib' wo du warst" },
    ],
  },
  {
    id: "neon-heart",
    title: "Neon Heart",
    album: "AFTERGLOW EP",
    type: "EP",
    cover: coverNeon,
    duration: 187,
    genre: "Synthpop",
    bpm: 108,
    key: "A Minor",
    mood: "Euphorisch",
    songwriter: "TAYO",
    producer: "TAYO, KIRO",
    isrc: "DEA621900102",
    explicit: false,
    links,
    lyrics: [
      { time: 0, line: "Ein Puls aus Licht, ein Herz aus Neon" },
      { time: 14, line: "Du tanzt im Spiegel, ich verlier' die Zeit" },
    ],
  },
  {
    id: "smoke-signals",
    title: "Smoke Signals",
    album: "AFTERGLOW EP",
    type: "EP",
    cover: coverSmoke,
    duration: 234,
    genre: "Trap / R&B",
    bpm: 74,
    key: "C Minor",
    mood: "Dunkel · Hypnotisch",
    songwriter: "TAYO, N. Adisa",
    producer: "NOVUM",
    isrc: "DEA621900103",
    explicit: true,
    links,
    lyrics: [
      { time: 0, line: "Rauchzeichen über der Skyline" },
      { time: 18, line: "Ich schick' dir Feuer, du schickst Stille" },
    ],
  },
  {
    id: "afterglow",
    title: "Afterglow",
    album: "AFTERGLOW EP",
    type: "EP",
    cover: coverNeon,
    duration: 199,
    genre: "Pop / R&B",
    bpm: 96,
    key: "D Major",
    mood: "Sehnsüchtig",
    songwriter: "TAYO",
    producer: "KIRO",
    isrc: "DEA621900104",
    explicit: false,
    links,
    lyrics: [{ time: 0, line: "Nach dem Licht bleibt immer noch ein Schimmer" }],
  },
  {
    id: "velvet-static",
    title: "Velvet Static",
    album: "MIDNIGHT GOLD",
    type: "Single",
    cover: coverMidnight,
    duration: 221,
    genre: "R&B",
    bpm: 84,
    key: "G Minor",
    mood: "Samtig",
    songwriter: "TAYO, L. Marek",
    producer: "NOVUM",
    isrc: "DEA621900105",
    explicit: false,
    links,
    lyrics: [{ time: 0, line: "Samt und Rauschen, dazwischen deine Stimme" }],
  },
  {
    id: "black-satin",
    title: "Black Satin",
    album: "SINGLES",
    type: "Single",
    cover: coverSmoke,
    duration: 176,
    genre: "Trap",
    bpm: 140,
    key: "E Minor",
    mood: "Kalt · Elegant",
    songwriter: "TAYO",
    producer: "TAYO",
    isrc: "DEA621900106",
    explicit: true,
    links,
    lyrics: [{ time: 0, line: "Schwarzer Satin, keine Spuren im Schnee" }],
  },
];

export type ReleaseStatus =
  | "Idee"
  | "In Produktion"
  | "Mixing"
  | "Mastering"
  | "Geplant"
  | "Vorbestellung"
  | "Veröffentlicht"
  | "Archiviert";

export type Release = {
  id: string;
  title: string;
  type: "Single" | "EP" | "Album" | "Deluxe";
  cover: string;
  date: string;
  status: ReleaseStatus;
  description: string;
  tracks: number;
};

export const RELEASES: Release[] = [
  {
    id: "midnight-gold",
    title: "MIDNIGHT GOLD",
    type: "Single",
    cover: coverMidnight,
    date: "2026-07-24",
    status: "Veröffentlicht",
    description: "Die neue Single — warmer R&B über kalten Synths.",
    tracks: 2,
  },
  {
    id: "afterglow-ep",
    title: "AFTERGLOW EP",
    type: "EP",
    cover: coverNeon,
    date: "2026-09-12",
    status: "Vorbestellung",
    description: "Fünf Tracks zwischen Euphorie und Abschied.",
    tracks: 5,
  },
  {
    id: "black-satin",
    title: "BLACK SATIN",
    type: "Single",
    cover: coverSmoke,
    date: "2026-10-31",
    status: "Mastering",
    description: "Trap-Cut mit orchestralem Unterbau.",
    tracks: 1,
  },
  {
    id: "nocturne-album",
    title: "NOCTURNE",
    type: "Album",
    cover: coverMidnight,
    date: "2027-02-14",
    status: "In Produktion",
    description: "Das Debütalbum. 14 Tracks.",
    tracks: 14,
  },
];

export type Video = {
  id: string;
  title: string;
  category: "Musikvideo" | "Visualizer" | "Lyric Video" | "Live" | "Behind the Scenes" | "Short";
  thumb: string;
  date: string;
  views: string;
  song: string;
};

export const VIDEOS: Video[] = [
  { id: "v1", title: "Midnight Gold — Official Video", category: "Musikvideo", thumb: coverMidnight, date: "2026-07-24", views: "1.2M", song: "Midnight Gold" },
  { id: "v2", title: "Neon Heart — Visualizer", category: "Visualizer", thumb: coverNeon, date: "2026-08-02", views: "410K", song: "Neon Heart" },
  { id: "v3", title: "Smoke Signals — Lyric Video", category: "Lyric Video", thumb: coverSmoke, date: "2026-08-16", views: "289K", song: "Smoke Signals" },
  { id: "v4", title: "Live at Kesselhaus", category: "Live", thumb: coverMidnight, date: "2026-06-09", views: "755K", song: "Velvet Static" },
  { id: "v5", title: "Studio Diaries — Afterglow", category: "Behind the Scenes", thumb: coverNeon, date: "2026-08-29", views: "132K", song: "Afterglow" },
  { id: "v6", title: "Black Satin — Teaser", category: "Short", thumb: coverSmoke, date: "2026-09-30", views: "98K", song: "Black Satin" },
];

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