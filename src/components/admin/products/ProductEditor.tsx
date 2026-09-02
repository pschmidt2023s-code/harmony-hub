import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, Image as ImageIcon, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { adminReleasesQueryOptions, adminSongsQueryOptions, slugifyTitle } from "@/lib/admin/releases";
import { adminVideoListQueryOptions } from "@/lib/admin/videos";
import {
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  saveProduct,
  saveVariants,
  uniqueProductSlug,
  type ProductRow,
  type VariantDraft,
  type VariantRow,
} from "@/lib/admin/products";
import { cn } from "@/lib/utils";

const TABS = ["Übersicht", "Preise", "Varianten", "Medien", "Digital", "Publishing", "SEO"] as const;
type Tab = (typeof TABS)[number];

type Props = {
  mode: "insert" | "update";
  product: ProductRow;
  variants: VariantRow[];
};

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const str = (v: number | null | undefined) => (v == null ? "" : String(v));

export function ProductEditor({ mode, product, variants }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);
  const videos = useQuery(adminVideoListQueryOptions);

  const [tab, setTab] = useState<Tab>("Übersicht");
  const [form, setForm] = useState<ProductRow>(product);
  const [rows, setRows] = useState<VariantDraft[]>(
    variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price == null ? null : Number(v.price),
      sale_price: v.sale_price == null ? null : Number(v.sale_price),
      available: v.available,
      stock: v.stock,
      image_url: v.image_url,
      digital_asset_url: v.digital_asset_url,
    })),
  );
  const [picker, setPicker] = useState<null | { kind: "image" | "audio" | "video"; field: string; index?: number }>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const slugWarning = useMemo(
    () => mode === "update" && product.status === "Veröffentlicht" && form.slug !== product.slug,
    [mode, product.slug, product.status, form.slug],
  );

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Bitte einen Produktnamen angeben.");
      setTab("Übersicht");
      return;
    }
    setSaving(true);
    try {
      const slug = slugifyTitle(form.slug || form.name) || (await uniqueProductSlug(form.name, form.id));
      const values = { ...form, slug, base_price: Number(form.base_price ?? 0) };
      await saveProduct(values, mode);
      await saveVariants(form.id, rows.filter((r) => r.name.trim()), variants);
      await qc.invalidateQueries({ queryKey: ["admin", "products"] });
      await qc.invalidateQueries({ queryKey: ["admin", "product", form.id] });
      await qc.invalidateQueries({ queryKey: ["shop-catalog"] });
      setDirty(false);
      toast.success("Produkt gespeichert");
      if (mode === "insert") void navigate({ to: "/admin/products/$id/edit", params: { id: form.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const field = "glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  const label = "text-[11px] uppercase tracking-[0.18em] text-muted-foreground";

  return (
    <div className="pb-16">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {mode === "update" && (
            <Link
              to="/admin/products/$id/preview"
              params={{ id: form.id }}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Eye className="size-3.5" /> Vorschau
            </Link>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Save className="size-3.5" /> {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>

      {dirty && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-xs text-primary">
          <AlertTriangle className="size-3.5" /> Ungespeicherte Änderungen.
        </p>
      )}

      {tab === "Übersicht" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>Produktname</span>
            <input className={cn(field, "mt-1")} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            <span className={label}>Slug</span>
            <input
              className={cn(field, "mt-1")}
              value={form.slug}
              onChange={(e) => set("slug", slugifyTitle(e.target.value))}
            />
            {slugWarning && (
              <span className="mt-1 block text-[11px] text-primary">
                Achtung: Dieses Produkt ist veröffentlicht — die öffentliche URL ändert sich.
              </span>
            )}
          </label>
          <label>
            <span className={label}>Produkttyp</span>
            <select className={cn(field, "mt-1")} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {[...new Set([form.type, ...PRODUCT_TYPES])].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Kurzbeschreibung</span>
            <input
              className={cn(field, "mt-1")}
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Beschreibung</span>
            <textarea
              rows={6}
              className={cn(field, "mt-1")}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label>
            <span className={label}>Badge (optional)</span>
            <input
              className={cn(field, "mt-1")}
              value={form.badge ?? ""}
              onChange={(e) => set("badge", e.target.value || null)}
            />
          </label>
          <label>
            <span className={label}>Sortierung</span>
            <input
              type="number"
              className={cn(field, "mt-1")}
              value={form.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
            />
          </label>

          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
            <label>
              <span className={label}>Release</span>
              <select
                className={cn(field, "mt-1")}
                value={form.release_id ?? ""}
                onChange={(e) => set("release_id", e.target.value || null)}
              >
                <option value="">— keine —</option>
                {(releases.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Song</span>
              <select
                className={cn(field, "mt-1")}
                value={form.song_id ?? ""}
                onChange={(e) => set("song_id", e.target.value || null)}
              >
                <option value="">— kein —</option>
                {(songs.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Video</span>
              <select
                className={cn(field, "mt-1")}
                value={form.video_id ?? ""}
                onChange={(e) => set("video_id", e.target.value || null)}
              >
                <option value="">— kein —</option>
                {(videos.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {tab === "Preise" && (
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Grundpreis</span>
            <input
              className={cn(field, "mt-1")}
              value={str(Number(form.base_price))}
              onChange={(e) => set("base_price", (num(e.target.value) ?? 0) as ProductRow["base_price"])}
            />
          </label>
          <label>
            <span className={label}>Aktionspreis (optional)</span>
            <input
              className={cn(field, "mt-1")}
              value={str(form.sale_price as number | null)}
              onChange={(e) => set("sale_price", num(e.target.value) as ProductRow["sale_price"])}
            />
          </label>
          <label>
            <span className={label}>Währung</span>
            <input
              className={cn(field, "mt-1")}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
            />
          </label>
          <label>
            <span className={label}>Bestand (optional)</span>
            <input
              className={cn(field, "mt-1")}
              value={str(form.stock)}
              onChange={(e) => set("stock", num(e.target.value))}
            />
          </label>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Varianten ohne eigenen Preis übernehmen automatisch den Grundpreis. Steuer- und Versandlogik bleibt
            unverändert.
          </p>
        </div>
      )}

      {tab === "Varianten" && (
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Keine Varianten vorhanden.</p>}
          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="glass grid gap-3 rounded-2xl p-4 sm:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto]">
              <input
                className={field}
                placeholder="Variantenname"
                value={r.name}
                onChange={(e) => {
                  setRows((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)));
                  setDirty(true);
                }}
              />
              <input
                className={field}
                placeholder="SKU"
                value={r.sku ?? ""}
                onChange={(e) => {
                  setRows((s) => s.map((x, j) => (j === i ? { ...x, sku: e.target.value || null } : x)));
                  setDirty(true);
                }}
              />
              <input
                className={field}
                placeholder="Preis"
                value={str(r.price)}
                onChange={(e) => {
                  setRows((s) => s.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)));
                  setDirty(true);
                }}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={r.available}
                  onChange={(e) => {
                    setRows((s) => s.map((x, j) => (j === i ? { ...x, available: e.target.checked } : x)));
                    setDirty(true);
                  }}
                />
                verfügbar
              </label>
              <button
                aria-label="Variante entfernen"
                onClick={() => {
                  setRows((s) => s.filter((_, j) => j !== i));
                  setDirty(true);
                }}
                className="justify-self-end rounded-full border border-border p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setRows((s) => [
                ...s,
                { name: "", sku: null, price: null, sale_price: null, available: true, stock: null, image_url: null, digital_asset_url: null },
              ]);
              setDirty(true);
            }}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" /> Variante hinzufügen
          </button>
        </div>
      )}

      {tab === "Medien" && (
        <div className="max-w-xl space-y-4">
          <div className="glass flex items-center gap-4 rounded-2xl p-4">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="size-20 rounded-xl object-cover" loading="lazy" />
            ) : (
              <div className="grid size-20 place-items-center rounded-xl bg-foreground/5 text-muted-foreground">
                <ImageIcon className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {form.image_url ? decodeURIComponent(form.image_url.split("/").pop() ?? "") : "Kein Produktbild"}
              </p>
              <p className="text-xs text-muted-foreground">Aus der bestehenden Mediathek — keine Kopien.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setPicker({ kind: "image", field: "image_url" })}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:text-primary"
              >
                Wählen
              </button>
              {form.image_url && (
                <button
                  onClick={() => set("image_url", null)}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive"
                  aria-label="Bild entfernen"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "Digital" && (
        <div className="max-w-xl space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_digital}
              onChange={(e) => set("is_digital", e.target.checked)}
            />
            Digitales Produkt
          </label>
          {form.is_digital ? (
            <div className="glass rounded-2xl p-4">
              <p className={label}>Geschützte Datei</p>
              <p className="mt-1 truncate text-sm">
                {form.digital_asset_url
                  ? decodeURIComponent(form.digital_asset_url.split("/").pop() ?? "")
                  : "Keine Datei hinterlegt"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPicker({ kind: "audio", field: "digital_asset_url" })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:text-primary"
                >
                  Audio wählen
                </button>
                <button
                  onClick={() => setPicker({ kind: "video", field: "digital_asset_url" })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:text-primary"
                >
                  Video wählen
                </button>
                {form.digital_asset_url && (
                  <button
                    onClick={() => set("digital_asset_url", null)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Die Datei bleibt im privaten Speicher der Mediathek und wird öffentlich nicht ausgeliefert. Eine
                Kaufberechtigung wird in dieser Phase bewusst nicht neu erfunden.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ohne Kennzeichnung „digital“ wird keine Datei mit dem Produkt verknüpft.
            </p>
          )}
        </div>
      )}

      {tab === "Publishing" && (
        <div className="max-w-xl space-y-4">
          <label>
            <span className={label}>Status</span>
            <select className={cn(field, "mt-1")} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {[...new Set([form.status, ...PRODUCT_STATUSES])].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Nur „Veröffentlicht“ ist öffentlich sichtbar. Entwurf, Offline und Archiviert bleiben privat — die
            Filterung erfolgt serverseitig.
          </p>
        </div>
      )}

      {tab === "SEO" && (
        <div className="max-w-xl space-y-4">
          <label className="block">
            <span className={label}>SEO-Titel</span>
            <input
              className={cn(field, "mt-1")}
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>SEO-Beschreibung</span>
            <textarea
              rows={4}
              className={cn(field, "mt-1")}
              value={form.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">Öffentliche URL: /shop/{form.slug || "…"}</p>
        </div>
      )}

      {picker && (
        <MediaPicker
          kind={picker.kind}
          title="Aus Mediathek wählen"
          onClose={() => setPicker(null)}
          onSelect={(asset) => {
            set(picker.field as keyof ProductRow, asset.url as never);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
