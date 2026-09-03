import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminSongsQueryOptions,
  adminVideosQueryOptions,
  isReleasePublic,
  newReleaseId,
  RELEASE_STATUSES,
  RELEASE_TYPES,
  saveRelease,
  slugifyTitle,
  STREAMING_SERVICES,
  uniqueSlug,
  type ReleaseRow,
  type SongRow,
} from "@/lib/admin/releases";
import { supabase } from "@/integrations/supabase/client";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { uploadMedia } from "@/lib/admin/media";

const TABS = [
  { id: "overview", label: "Übersicht" },
  { id: "tracklist", label: "Tracklist" },
  { id: "lyrics", label: "Lyrics" },
  { id: "credits", label: "Credits" },
  { id: "streaming", label: "Streaming" },
  { id: "media", label: "Media" },
  { id: "publishing", label: "Publishing & SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Credit = { role: string; names: string };

function emptyRelease(): ReleaseRow {
  return {
    id: newReleaseId(),
    slug: "",
    title: "",
    artist: "TAYO",
    type: "Single",
    cover_key: "midnight",
    cover_url: null,
    release_date: new Date().toISOString().slice(0, 10),
    publish_at: null,
    status: "Entwurf",
    description: "",
    short_description: "",
    explicit: false,
    links: {},
    credits: [],
    video_id: null,
    seo_title: "",
    seo_description: "",
    tracks: 1,
    created_at: null as unknown as string,
    updated_at: null as unknown as string,
  } as unknown as ReleaseRow;
}

export function ReleaseEditor({ mode, initial }: { mode: "new" | "edit"; initial?: ReleaseRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<ReleaseRow>(() => initial ?? emptyRelease());
  const [tab, setTab] = useState<TabId>("overview");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const savedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const songs = useQuery(adminSongsQueryOptions);
  const videos = useQuery(adminVideosQueryOptions);

  const set = <K extends keyof ReleaseRow>(key: K, value: ReleaseRow[K]) => {
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

  const tracks = useMemo(
    () =>
      (songs.data ?? [])
        .filter((s) => (s.release_id ? s.release_id === form.id : s.album === form.title && form.title.trim().length > 0))
        .sort((a, b) => a.sort_order - b.sort_order),
    [songs.data, form.title],
  );

  const otherSongs = useMemo(
    () => (songs.data ?? []).filter((s) => s.release_id !== form.id),
    [songs.data, form.id],
  );

  const links = (form.links ?? {}) as Record<string, string>;
  const credits = (form.credits ?? []) as Credit[];
  const live = isReleasePublic(form);

  async function persist(overrides?: Partial<ReleaseRow>, message = "Gespeichert") {
    if (!form.title.trim()) {
      toast.error("Bitte einen Titel angeben.");
      setTab("overview");
      return;
    }
    setSaving(true);
    try {
      const slug = slugTouched && form.slug ? form.slug : await uniqueSlug(form.title, form.id);
      const payload = {
        ...form,
        ...overrides,
        slug,
        tracks: tracks.length || form.tracks || 1,
      };
      const { created_at: _c, updated_at: _u, ...clean } = payload as ReleaseRow;
      await saveRelease(clean, mode === "new" ? "insert" : "update");
      savedRef.current = true;
      setDirty(false);
      setForm((f) => ({ ...f, ...overrides, slug }));
      void qc.invalidateQueries({ queryKey: ["admin", "releases"] });
      void qc.invalidateQueries({ queryKey: ["content"] });
      toast.success(message);
      if (mode === "new") {
        void navigate({ to: "/admin/releases/$id/edit", params: { id: payload.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
      savedRef.current = false;
    }
  }

  async function reorder(song: SongRow, dir: -1 | 1) {
    const idx = tracks.findIndex((t) => t.id === song.id);
    const other = tracks[idx + dir];
    if (!other) return;
    await Promise.all([
      supabase.from("songs").update({ sort_order: other.sort_order }).eq("id", song.id),
      supabase.from("songs").update({ sort_order: song.sort_order }).eq("id", other.id),
    ]);
    void qc.invalidateQueries({ queryKey: ["admin", "songs"] });
    void qc.invalidateQueries({ queryKey: ["content"] });
  }

  async function setSongAlbum(id: string, album: string) {
    // Zuordnung über release_id; der Albumtitel bleibt als Anzeigefeld synchron.
    const { error } = await supabase
      .from("songs")
      .update({ album, release_id: album ? form.id : null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin", "songs"] });
    void qc.invalidateQueries({ queryKey: ["content"] });
  }

  async function onArtwork(file: File) {
    setSaving(true);
    try {
      const { url } = await uploadMedia(file, "covers");
      set("cover_url", url);
      toast.success("Artwork hochgeladen");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 pb-28">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/releases" className="text-sm text-muted-foreground hover:text-primary">
          ← Releases
        </Link>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] ${
            live ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {live ? "Live" : form.status}
        </span>
        {dirty && <span className="text-xs text-muted-foreground">Ungespeicherte Änderungen</span>}
      </div>

      <h1 className="text-3xl font-extrabold uppercase">
        {form.title.trim() || (mode === "new" ? "Neues Release" : "Release")}
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
                  {RELEASE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Release-Datum">
                <input
                  type="date"
                  value={form.release_date}
                  onChange={(e) => set("release_date", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Kurzbeschreibung">
                <input
                  value={form.short_description ?? ""}
                  onChange={(e) => set("short_description", e.target.value)}
                  className={inputCls}
                />
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
                rows={6}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>
        )}

        {tab === "tracklist" && (
          <Card>
            {tracks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Noch keine Songs zugeordnet. Songs unten hinzufügen oder im{" "}
                <Link to="/admin/songs" className="text-primary">
                  Song-Editor
                </Link>{" "}
                anlegen.
              </p>
            )}
            <div className="grid gap-2">
              {tracks.map((t, i) => (
                <div key={t.id} className="glass flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5">
                  <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <button
                    disabled={i === 0}
                    onClick={() => void reorder(t, -1)}
                    className="rounded-full p-2 disabled:opacity-30"
                    aria-label="Nach oben"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    disabled={i === tracks.length - 1}
                    onClick={() => void reorder(t, 1)}
                    className="rounded-full p-2 disabled:opacity-30"
                    aria-label="Nach unten"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <Link to="/admin/songs" className="rounded-full p-2 text-muted-foreground hover:text-primary">
                    <ExternalLink className="size-4" />
                  </Link>
                  <button
                    onClick={() => void setSongAlbum(t.id, "")}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Entfernen"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <Field label="Song zuordnen">
              <select
                value=""
                onChange={(e) => e.target.value && void setSongAlbum(e.target.value, form.title)}
                disabled={!form.title.trim()}
                className={inputCls}
              >
                <option value="">Song auswählen…</option>
                {otherSongs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.album ? ` — aktuell: ${s.album}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
        )}

        {tab === "lyrics" && (
          <Card>
            {tracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zuerst Songs in der Tracklist zuordnen.</p>
            ) : (
              <LyricsEditor tracks={tracks} onSaved={() => void qc.invalidateQueries({ queryKey: ["admin", "songs"] })} />
            )}
          </Card>
        )}

        {tab === "credits" && (
          <Card>
            <div className="grid gap-3">
              {credits.map((c, i) => (
                <div key={i} className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <input
                    value={c.role}
                    placeholder="Rolle (z. B. Produktion)"
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
            <button
              onClick={() => set("credits", [...credits, { role: "", names: "" }] as never)}
              className="glass w-fit rounded-full px-4 py-2 text-sm hover:text-primary"
            >
              + Credit hinzufügen
            </button>
            <p className="text-xs text-muted-foreground">
              Ohne eigene Credits werden die Credits automatisch aus den Songs übernommen.
            </p>
          </Card>
        )}

        {tab === "streaming" && (
          <Card>
            <Grid>
              {STREAMING_SERVICES.map((s) => (
                <Field key={s.id} label={s.label}>
                  <input
                    value={links[s.id] ?? ""}
                    placeholder="https://…"
                    onChange={(e) => set("links", { ...links, [s.id]: e.target.value } as never)}
                    className={inputCls}
                  />
                </Field>
              ))}
              <Field label="Pre-Save Link">
                <input
                  value={links["presave"] ?? ""}
                  placeholder="https://… (nur echte Pre-Save-Kampagne)"
                  onChange={(e) => set("links", { ...links, presave: e.target.value } as never)}
                  className={inputCls}
                />
              </Field>
            </Grid>
            <p className="mt-3 text-xs text-muted-foreground">
              Ohne Pre-Save-Link wird auf der Release-Seite kein Pre-Save-Button angezeigt.
            </p>
          </Card>
        )}

        {tab === "media" && (
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="glass grid aspect-square w-full max-w-[16rem] place-items-center overflow-hidden rounded-2xl">
                {form.cover_url ? (
                  <img src={form.cover_url} alt="Artwork" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-3">
                <label className="glass inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary">
                  <Upload className="size-4" /> Artwork hochladen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onArtwork(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
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
                <Field label="Verknüpftes Video">
                  <select
                    value={form.video_id ?? ""}
                    onChange={(e) => set("video_id", e.target.value || null)}
                    className={inputCls}
                  >
                    <option value="">Automatisch (nach Songtitel)</option>
                    {(videos.data ?? []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Card>
        )}

        {tab === "publishing" && (
          <Card>
            <Grid>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                  {RELEASE_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Geplante Veröffentlichung">
                <input
                  type="datetime-local"
                  value={form.publish_at ? form.publish_at.slice(0, 16) : ""}
                  onChange={(e) =>
                    set("publish_at", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                  className={inputCls}
                />
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
              <Field label="SEO-Titel">
                <input
                  value={form.seo_title ?? ""}
                  onChange={(e) => set("seo_title", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid>
            <Field label="SEO-Beschreibung">
              <textarea
                rows={3}
                value={form.seo_description ?? ""}
                onChange={(e) => set("seo_description", e.target.value)}
                className={inputCls}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Status „Geplant" mit Zeitpunkt veröffentlicht das Release automatisch, sobald der Zeitpunkt
              erreicht ist. Entwürfe, archivierte und zukünftige Releases sind nie öffentlich sichtbar.
            </p>
          </Card>
        )}
      </div>

      <div className="glass-strong fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 px-5 py-4 md:left-[var(--admin-sidebar,0px)]">
        {mode === "edit" && (
          <Link
            to="/admin/releases/$id/preview"
            params={{ id: form.id }}
            className="glass rounded-full px-5 py-2.5 text-sm hover:text-primary"
          >
            Vorschau
          </Link>
        )}
        <button
          onClick={() => void persist()}
          disabled={saving}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Speichern
        </button>
        {live ? (
          <button
            onClick={() => void persist({ status: "Entwurf" } as Partial<ReleaseRow>, "Offline genommen")}
            disabled={saving}
            className="glass rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
          >
            Offline nehmen
          </button>
        ) : (
          <button
            onClick={() => void persist({ status: "Veröffentlicht" } as Partial<ReleaseRow>, "Veröffentlicht")}
            disabled={saving}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Veröffentlichen
          </button>
        )}
      </div>

      {pickerOpen && (
        <MediaPicker
          kind="image"
          title="Artwork aus der Mediathek"
          onClose={() => setPickerOpen(false)}
          onSelect={(asset) => {
            set("cover_url", asset.url);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LyricsEditor({ tracks, onSaved }: { tracks: SongRow[]; onSaved: () => void }) {
  const [id, setId] = useState(tracks[0]?.id ?? "");
  const song = tracks.find((t) => t.id === id) ?? tracks[0];
  const toText = (s?: SongRow) =>
    ((s?.lyrics ?? []) as { time: number; line: string }[])
      .map((l) => `${Math.floor(l.time / 60)}:${String(l.time % 60).padStart(2, "0")} ${l.line}`)
      .join("\n");
  const [text, setText] = useState(() => toText(song));
  const [busy, setBusy] = useState(false);

  useEffect(() => setText(toText(song)), [song?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!song) return;
    setBusy(true);
    const lyrics = text
      .split("\n")
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const m = raw.match(/^(\d+):(\d{1,2})\s+(.*)$/);
        if (!m) return { time: 0, line: raw };
        return { time: Number(m[1]) * 60 + Number(m[2]), line: m[3] ?? "" };
      });
    const { error } = await supabase.from("songs").update({ lyrics }).eq("id", song.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lyrics gespeichert");
    onSaved();
  }

  return (
    <div className="grid gap-4">
      <Field label="Song">
        <select value={song?.id ?? ""} onChange={(e) => setId(e.target.value)} className={inputCls}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Lyrics (Format: 0:12 Zeile)">
        <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
      </Field>
      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        Lyrics speichern
      </button>
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
