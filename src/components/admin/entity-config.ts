export type FieldKind = "text" | "textarea" | "number" | "date" | "bool" | "json" | "select";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  full?: boolean;
  defaultValue?: unknown;
};

export type EntityDef = {
  key: "releases" | "songs" | "videos";
  label: string;
  titleField: string;
  orderBy: { column: string; ascending: boolean };
  fields: FieldDef[];
};

const COVER_KEYS = ["midnight", "neon", "smoke"] as const;

export const ENTITIES: EntityDef[] = [
  {
    key: "releases",
    label: "Releases",
    titleField: "title",
    orderBy: { column: "release_date", ascending: true },
    fields: [
      { name: "id", label: "ID (slug)", kind: "text", defaultValue: "" },
      { name: "title", label: "Titel", kind: "text", defaultValue: "" },
      {
        name: "type",
        label: "Typ",
        kind: "select",
        options: ["Single", "EP", "Album", "Deluxe"],
        defaultValue: "Single",
      },
      { name: "cover_key", label: "Cover", kind: "select", options: COVER_KEYS, defaultValue: "midnight" },
      { name: "release_date", label: "Datum", kind: "date", defaultValue: "" },
      {
        name: "status",
        label: "Status",
        kind: "select",
        options: [
          "Idee",
          "In Produktion",
          "Mixing",
          "Mastering",
          "Geplant",
          "Vorbestellung",
          "Veröffentlicht",
          "Archiviert",
        ],
        defaultValue: "Geplant",
      },
      { name: "tracks", label: "Tracks", kind: "number", defaultValue: 1 },
      { name: "description", label: "Beschreibung", kind: "textarea", full: true, defaultValue: "" },
    ],
  },
  {
    key: "songs",
    label: "Songs",
    titleField: "title",
    orderBy: { column: "sort_order", ascending: true },
    fields: [
      { name: "id", label: "ID (slug)", kind: "text", defaultValue: "" },
      { name: "title", label: "Titel", kind: "text", defaultValue: "" },
      { name: "album", label: "Album", kind: "text", defaultValue: "" },
      { name: "type", label: "Typ", kind: "select", options: ["Single", "EP", "Album"], defaultValue: "Single" },
      { name: "cover_key", label: "Cover", kind: "select", options: COVER_KEYS, defaultValue: "midnight" },
      { name: "duration", label: "Dauer (Sek.)", kind: "number", defaultValue: 180 },
      { name: "genre", label: "Genre", kind: "text", defaultValue: "R&B" },
      { name: "bpm", label: "BPM", kind: "number", defaultValue: 90 },
      { name: "song_key", label: "Tonart", kind: "text", defaultValue: "Am" },
      { name: "mood", label: "Mood", kind: "text", defaultValue: "" },
      { name: "songwriter", label: "Songwriter", kind: "text", defaultValue: "TAYO" },
      { name: "producer", label: "Produzent", kind: "text", defaultValue: "" },
      { name: "isrc", label: "ISRC", kind: "text", defaultValue: "" },
      { name: "sort_order", label: "Sortierung", kind: "number", defaultValue: 0 },
      { name: "explicit", label: "Explicit", kind: "bool", defaultValue: false },
      {
        name: "links",
        label: "Streaming-Links (JSON)",
        kind: "json",
        full: true,
        defaultValue: { spotify: "#", apple: "#", youtube: "#", amazon: "#", deezer: "#" },
      },
      { name: "lyrics", label: "Lyrics (JSON: time/line)", kind: "json", full: true, defaultValue: [] },
    ],
  },
  {
    key: "videos",
    label: "Videos",
    titleField: "title",
    orderBy: { column: "sort_order", ascending: true },
    fields: [
      { name: "id", label: "ID (slug)", kind: "text", defaultValue: "" },
      { name: "title", label: "Titel", kind: "text", defaultValue: "" },
      {
        name: "category",
        label: "Kategorie",
        kind: "select",
        options: ["Musikvideo", "Visualizer", "Lyric Video", "Live", "Behind the Scenes", "Short"],
        defaultValue: "Musikvideo",
      },
      { name: "thumb_key", label: "Thumbnail", kind: "select", options: COVER_KEYS, defaultValue: "neon" },
      { name: "video_date", label: "Datum", kind: "date", defaultValue: "" },
      { name: "views", label: "Views", kind: "text", defaultValue: "0" },
      { name: "song", label: "Song", kind: "text", defaultValue: "" },
      { name: "sort_order", label: "Sortierung", kind: "number", defaultValue: 0 },
    ],
  },
];

export const emptyRecord = (def: EntityDef): Record<string, unknown> =>
  Object.fromEntries(def.fields.map((f) => [f.name, f.defaultValue ?? ""]));