import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Music2, Pause, Play, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  AUDIO_ACCEPT,
  audioFileName,
  lyricsToText,
  newSongId,
  readAudioDuration,
  saveSong,
  SONG_CREDIT_ROLES,
  SONG_STATUSES,
  SONG_TYPES,
  textToLyrics,
  uniqueSongSlug,
  type SongCredit,
  type SongRow,
} from "@/lib/admin/songs";
import {
  adminReleasesQueryOptions,
  isReleasePublic,
  slugifyTitle,
  STREAMING_SERVICES,
  uploadMedia,
} from "@/lib/admin/releases";
import { formatDate, formatTime, type Song } from "@/lib/data";
import { usePlayer } from "@/components/player/player-context";
import { MediaPicker } from "@/components/admin/media/MediaPicker";

const TABS = [
  { id: "overview", label: "Übersicht" },
  { id: "audio", label: "Audio" },
  { id: "lyrics", label: "Lyrics" },
  { id: "credits", label: "Credits" },
  { id: "artwork", label: "Artwork" },
  { id: "releases", label: "Release" },
  { id: "publishing", label: "Verfügbarkeit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function emptySong(): SongRow {
  return {
    id: newSongId(),
    slug: "",
    title: "",
    artist: "TAYO",
    album: "",
    release_id: null,
    type: "Single",
    cover_key: "midnight",
    cover_url: null,
    audio_url: null,
    duration: 0,
    description: "",
    language: "",
    genre: "",
    bpm: 0,
    song_key: "",
    mood: "",
    songwriter: "",
    producer: "",
    isrc: "",
    explicit: false,
    links: {},
    lyrics: [],
    credits: [],
    sort_order: 0,
    status: "Entwurf",
    created_at: null as unknown as string,
    updated_at: null as unknown as string,
  } as unknown as SongRow;
}

/** Admin-Vorschau-Objekt für den globalen Player (keine zweite Player-Implementierung). */
export function toPlayerSong(row: SongRow, coverFallback?: string): Song {
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title || "Ohne Titel",
    artist: row.artist || "TAYO",
    album: row.album ?? "",
    releaseId: row.release_id,
    type: (row.type as Song["type"]) ?? "Single",
    cover: row.cover_url || coverFallback || "/icons/icon-192.png",
    audio: row.audio_url,
    duration: row.duration || 0,
    description: row.description ?? "",
    language: row.language ?? "",
    genre: row.genre ?? "",
    bpm: row.bpm ?? 0,
    key: row.song_key ?? "",
    mood: row.mood ?? "",
    songwriter: row.songwriter ?? "",
    producer: row.producer ?? "",
    isrc: row.isrc ?? "",
    explicit: Boolean(row.explicit),
    links: (row.links ?? {}) as Song["links"],
    lyrics: (row.lyrics ?? []) as unknown as Song["lyrics"],
    credits: (row.credits ?? []) as unknown as SongCredit[],
  };
}

export function SongEditor({ mode, initial }: { mode: "new" | "edit"; initial?: SongRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const player = usePlayer();
  const [form, setForm] = useState<SongRow>(() => initial ?? emptySong());
  const [lyricsText, setLyricsText] = useState(() =>
    lyricsToText((initial?.lyrics ?? []) as unknown as { time: number; line: string }[]),
  );
  const [tab, setTab] = useState<TabId>("overview");
  const [picker, setPicker] = useState<"image" | "audio" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | "audio" | "cover">(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const savedRef = useRef(false);

  const releases = useQuery(adminReleasesQueryOptions);
  const release = (releases.data ?? []).find((r) => r.id === form.release_id) ?? null;

  const set = <K extends keyof SongRow>(key: K, value: SongRow[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty || savedRef.current) return false;
      return !window.confirm("Ungespeicherte Änderungen verwerfen?");
    },
  });

  const credits = (form.credits ?? []) as unknown as SongCredit[];
  const links = (form.links ?? {}) as Record<string, string>;
  const playing = player.playing && player.current?.id === form.id;

  const status = useMemo(() => {
    if (form.status === "Archiviert" || form.status === "Entwurf") return form.status;
    if (release && !isReleasePublic(release)) return "Wartet auf Release";
    if (form.status === "Geplant") return "Geplant";
    return "Öffentlich";
  }, [form.status, release]);

  async function persist(overrides?: Partial<SongRow>, message = "Gespeichert") {
    const next = { ...form, ...overrides };
    if (!next.title.trim()) {
      toast.error("Bitte einen Titel angeben.");
      setTab("overview");
      return;
    }
    if (!next.artist?.trim()) {
      toast.error("Bitte einen Artist angeben.");
      setTab("overview");
      return;
    }
    if (next.status === "Veröffentlicht" && !next.audio_url) {
      toast.error("Ohne Audio kann der Song nicht veröffentlicht werden.");
      setTab("audio");
      return;
    }
    setSaving(true);
    try {
      const slug = slugTouched && next.slug ? next.slug : await uniqueSongSlug(next.title, next.id);
      const payload = {
        ...next,
        slug,
        lyrics: textToLyrics(lyricsText) as unknown as SongRow["lyrics"],
        album: release?.title ?? next.album ?? "",
      };
      const { created_at: _c, updated_at: _u, ...clean } = payload as SongRow;
      await saveSong(clean, mode === "new" ? "insert" : "update");
      savedRef.current = true;
      setDirty(false);
      setForm((f) => ({ ...f, ...overrides, slug, album: payload.album }));
      void qc.invalidateQueries({ queryKey: ["admin", "songs"] });
      void qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(message);
      if (mode === "new") void navigate({ to: "/admin/songs/$id/edit", params: { id: payload.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
      savedRef.current = false;
    }
  }

  async function onAudio(file: File) {
    setUploading("audio");
    setUploadError(null);
    try {
      const duration = await readAudioDuration(file);
      const { url } = await uploadMedia(file, "audio");
      setForm((f) => ({ ...f, audio_url: url, duration: duration ?? f.duration }));
      setDirty(true);
      toast.success(duration ? `Audio hochgeladen (${formatTime(duration)})` : "Audio hochgeladen");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  }

  async function onCover(file: File) {
    setUploading("cover");
    setUploadError(null);
    try {
      const { url } = await uploadMedia(file, "covers");
      set("cover_url", url);
      toast.success("Artwork hochgeladen");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  }

  function preview() {
    if (!form.audio_url) {
      toast.error("Kein Audio hinterlegt.");
      setTab("audio");
      return;
    }
    if (playing) {
      player.toggle();
      return;
    }
    player.play(toPlayerSong(form, release?.cover_url ?? undefined), [
      toPlayerSong(form, release?.cover_url ?? undefined),
    ]);
  }

  return (
    <div className="min-w-0 pb-28">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/songs" className="text-sm text-muted-foreground hover:text-primary">
          ← Songs
        </Link>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] ${
            status === "Öffentlich" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {status}
        </span>
        {dirty && <span className="text-xs text-muted-foreground">Ungespeicherte Änderungen</span>}
        {saving && <span className="text-xs text-muted-foreground">Speichert…</span>}
      </div>

      <h1 className="text-3xl font-extrabold uppercase">
        {form.title.trim() || (mode === "new" ? "Neuer Song" : "Song")}
      </h1>

      <div className="mt-6 -mx-1 flex gap-1 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "glass hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5">
        {tab === "overview" && (
          <Card>
            <Grid>
              <Field label="Titel">
                <input
                  value={form.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", slugifyTitle(e.target.value));
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Artist">
                <input value={form.artist ?? ""} onChange={(e) => set("artist", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Typ">
                <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                  {SONG_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Genre">
                <input value={form.genre ?? ""} onChange={(e) => set("genre", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sprache">
                <input
                  value={form.language ?? ""}
                  placeholder="z. B. Deutsch"
                  onChange={(e) => set("language", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="ISRC">
                <input value={form.isrc ?? ""} onChange={(e) => set("isrc", e.target.value)} className={inputCls} />
              </Field>
              <Field label="BPM">
                <input
                  type="number"
                  value={form.bpm ?? 0}
                  onChange={(e) => set("bpm", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Tonart">
                <input
                  value={form.song_key ?? ""}
                  onChange={(e) => set("song_key", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Mood">
                <input value={form.mood ?? ""} onChange={(e) => set("mood", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Explicit">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.explicit)}
                    onChange={(e) => set("explicit", e.target.checked)}
                  />
                  Explicit Content
                </label>
              </Field>
            </Grid>
            <Field label="Beschreibung">
              <textarea
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>
        )}

        {tab === "audio" && (
          <Card>
            <div className="glass flex min-w-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
              <Music2 className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{audioFileName(form.audio_url) ?? "Kein Audio hinterlegt"}</p>
                <p className="text-xs text-muted-foreground">
                  {form.duration ? `Dauer ${formatTime(form.duration)}` : "Dauer unbekannt"}
                  {uploading === "audio" ? " · lädt hoch…" : ""}
                </p>
              </div>
              <button
                onClick={preview}
                disabled={!form.audio_url}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm hover:text-primary disabled:opacity-40"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />} Play Preview
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="glass inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary">
                {uploading === "audio" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {form.audio_url ? "Audio ersetzen" : "Audio hochladen"}
                <input
                  type="file"
                  accept={AUDIO_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onAudio(f);
                  }}
                />
              </label>
              {form.audio_url && (
                <button
                  onClick={() => {
                    if (window.confirm("Audio-Verweis entfernen? Die Datei bleibt im Speicher erhalten.")) {
                      set("audio_url", null);
                    }
                  }}
                  className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-destructive"
                >
                  <Trash2 className="size-4" /> Audio entfernen
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPicker("audio")}
              className="glass inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary"
            >
              <Music2 className="size-4" /> Aus Mediathek wählen
            </button>

            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

            <Grid>
              <Field label="Audio-URL">
                <input
                  value={form.audio_url ?? ""}
                  onChange={(e) => set("audio_url", e.target.value || null)}
                  className={inputCls}
                />
              </Field>
              <Field label="Dauer (Sekunden)">
                <input
                  type="number"
                  value={form.duration ?? 0}
                  onChange={(e) => set("duration", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </Grid>
            <p className="text-xs text-muted-foreground">
              Audio liegt im privaten Speicher und wird nur über die geschützte Auslieferung bereitgestellt.
            </p>
          </Card>
        )}

        {tab === "lyrics" && (
          <Card>
            <Field label="Lyrics">
              <textarea
                rows={18}
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value);
                  setDirty(true);
                }}
                placeholder="Eine Zeile pro Zeile. Optional mit Zeitmarke: [0:12] Textzeile"
                className={`${inputCls} font-mono leading-relaxed whitespace-pre`}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {lyricsText.trim()
                ? "Zeilenumbrüche und Leerzeilen bleiben erhalten."
                : "Noch keine Lyrics. Ohne Lyrics wird der Bereich öffentlich nicht angezeigt."}
            </p>
          </Card>
        )}

        {tab === "credits" && (
          <Card>
            <div className="grid gap-3">
              {credits.map((c, i) => (
                <div key={i} className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <input
                    value={c.role}
                    list="song-credit-roles"
                    placeholder="Rolle"
                    onChange={(e) => {
                      const next = [...credits];
                      next[i] = { ...c, role: e.target.value };
                      set("credits", next as never);
                    }}
                    className={inputCls}
                  />
                  <input
                    value={c.names}
                    placeholder="Namen, kommagetrennt"
                    onChange={(e) => {
                      const next = [...credits];
                      next[i] = { ...c, names: e.target.value };
                      set("credits", next as never);
                    }}
                    className={inputCls}
                  />
                  <button
                    onClick={() => set("credits", credits.filter((_, j) => j !== i) as never)}
                    className="glass rounded-xl px-3 py-2 text-muted-foreground hover:text-destructive"
                    aria-label="Credit entfernen"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <datalist id="song-credit-roles">
              {SONG_CREDIT_ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <button
              onClick={() => set("credits", [...credits, { role: "", names: "" }] as never)}
              className="glass w-fit rounded-full px-4 py-2 text-sm hover:text-primary"
            >
              + Credit hinzufügen
            </button>
            <Grid>
              <Field label="Songwriter (klassisch)">
                <input
                  value={form.songwriter ?? ""}
                  onChange={(e) => set("songwriter", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Produzent (klassisch)">
                <input
                  value={form.producer ?? ""}
                  onChange={(e) => set("producer", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid>
          </Card>
        )}

        {tab === "artwork" && (
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="glass grid aspect-square w-full max-w-[16rem] place-items-center overflow-hidden rounded-2xl">
                {form.cover_url || release?.cover_url ? (
                  <img
                    src={form.cover_url || release?.cover_url || ""}
                    alt="Artwork"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImagePlus className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-3">
                <label className="glass inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary">
                  {uploading === "cover" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Artwork hochladen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onCover(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPicker("image")}
                  className="glass inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary"
                >
                  <ImagePlus className="size-4" /> Aus Mediathek wählen
                </button>
                <Field label="Artwork-URL">
                  <input
                    value={form.cover_url ?? ""}
                    onChange={(e) => set("cover_url", e.target.value || null)}
                    className={inputCls}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Ohne eigenes Artwork wird automatisch das Cover des zugeordneten Releases verwendet.
                </p>
              </div>
            </div>
          </Card>
        )}

        {tab === "releases" && (
          <Card>
            <Field label="Release-Zuordnung">
              <select
                value={form.release_id ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const rel = (releases.data ?? []).find((r) => r.id === id);
                  setForm((f) => ({ ...f, release_id: id, album: rel?.title ?? "" }));
                  setDirty(true);
                }}
                className={inputCls}
              >
                <option value="">Kein Release (Standalone)</option>
                {(releases.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {r.status}
                  </option>
                ))}
              </select>
            </Field>

            {release && (
              <div className="glass flex min-w-0 items-center gap-4 rounded-2xl p-4">
                <img
                  src={release.cover_url || "/icons/icon-192.png"}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold uppercase">{release.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {formatDate(release.release_date)} · {isReleasePublic(release) ? "Live" : release.status}
                  </p>
                </div>
                <Link
                  to="/admin/releases/$id/edit"
                  params={{ id: release.id }}
                  className="glass rounded-full px-3 py-2 text-xs hover:text-primary"
                >
                  Release öffnen
                </Link>
              </div>
            )}

            <Field label="Track-Position im Release">
              <input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Ein Song bleibt beim Zuordnen derselbe Datensatz — es entstehen keine Kopien. Entfernen aus einem
              Release löscht den Song nicht.
            </p>
          </Card>
        )}

        {tab === "publishing" && (
          <Card>
            <Grid>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                  {SONG_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Slug (URL)">
                <input
                  value={form.slug ?? ""}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugifyTitle(e.target.value));
                  }}
                  className={inputCls}
                />
              </Field>
            </Grid>
            <Grid>
              {STREAMING_SERVICES.slice(0, 5).map((s) => (
                <Field key={s.id} label={s.label}>
                  <input
                    value={links[s.id] ?? ""}
                    placeholder="https://…"
                    onChange={(e) => set("links", { ...links, [s.id]: e.target.value } as never)}
                    className={inputCls}
                  />
                </Field>
              ))}
            </Grid>
            <p className="text-xs text-muted-foreground">
              Gehört der Song zu einem Release, wird er erst öffentlich, sobald das Release live ist. Ohne Release
              entscheidet der Song-Status. Archivierte Songs bleiben mit Audio, Lyrics und Credits erhalten.
            </p>
          </Card>
        )}
      </div>

      <div className="glass-strong fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-end gap-3 border-t border-white/5 px-4 py-3 md:left-[var(--admin-sidebar,0px)]">
        <span className="mr-auto text-xs text-muted-foreground">
          {saving ? "Speichert…" : dirty ? "Ungespeicherte Änderungen" : "Gespeichert"}
        </span>
        <button
          onClick={preview}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm hover:text-primary"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />} Preview
        </button>
        <button
          onClick={() => void persist()}
          disabled={saving}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Speichern
        </button>
        <button
          onClick={() => void persist({ status: "Veröffentlicht" }, "Song veröffentlicht")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Upload className="size-4" /> Veröffentlichen
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "glass w-full min-w-0 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass grid min-w-0 gap-5 rounded-2xl p-5 md:p-6">{children}</div>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
