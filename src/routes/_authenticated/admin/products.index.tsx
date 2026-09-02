import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Eye, Package, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminError, AdminNotice, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import {
  adminProductsQueryOptions,
  adminVariantsQueryOptions,
  duplicateProduct,
  PAGE_SIZE,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  productAvailability,
  setProductStatus,
  type ProductRow,
} from "@/lib/admin/products";
import { effectivePrice, money, productImage } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: ProductsAdminPage,
});

type SortKey = "sort" | "name" | "price" | "updated";

function ProductsAdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const products = useQuery(adminProductsQueryOptions);
  const variants = useQuery(adminVariantsQueryOptions);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alle");
  const [type, setType] = useState("alle");
  const [sort, setSort] = useState<SortKey>("sort");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirm, setConfirm] = useState<{ product: ProductRow; next: string } | null>(null);

  const variantCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variants.data ?? []) m.set(v.product_id, (m.get(v.product_id) ?? 0) + 1);
    return m;
  }, [variants.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    void qc.invalidateQueries({ queryKey: ["admin", "product-variants"] });
    void qc.invalidateQueries({ queryKey: ["shop-catalog"] });
  };

  const action = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen"),
  });

  const rows = useMemo(() => {
    let list = products.data ?? [];
    const term = q.trim().toLowerCase();
    if (term) {
      const skus = new Map<string, string>();
      for (const v of variants.data ?? [])
        if (v.sku) skus.set(v.product_id, `${skus.get(v.product_id) ?? ""} ${v.sku}`);
      list = list.filter((p) =>
        [p.name, p.slug, p.type, skus.get(p.id) ?? ""].join(" ").toLowerCase().includes(term),
      );
    }
    if (status !== "alle") list = list.filter((p) => p.status === status);
    if (type !== "alle") list = list.filter((p) => p.type === type);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return Number(b.base_price) - Number(a.base_price);
      if (sort === "updated") return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      return a.sort_order - b.sort_order;
    });
    return sorted;
  }, [products.data, variants.data, q, status, type, sort]);

  const page = rows.slice(0, visible);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Produkte, Varianten, Preise und digitale Inhalte."
        action={
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="size-3.5" /> Neues Produkt
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="glass flex min-w-[220px] flex-1 items-center gap-2 rounded-full px-4 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Name, Slug, SKU oder Typ"
            aria-label="Produkte durchsuchen"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Statusfilter"
          className="glass rounded-full px-4 py-2 text-xs outline-none"
        >
          <option value="alle">Alle Status</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Typfilter"
          className="glass rounded-full px-4 py-2 text-xs outline-none"
        >
          <option value="alle">Alle Typen</option>
          {[...new Set([...(products.data ?? []).map((p) => p.type), ...PRODUCT_TYPES])].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sortierung"
          className="glass rounded-full px-4 py-2 text-xs outline-none"
        >
          <option value="sort">Sortierung</option>
          <option value="name">Name</option>
          <option value="price">Preis</option>
          <option value="updated">Zuletzt geändert</option>
        </select>
      </div>

      {products.isLoading ? (
        <AdminSkeleton rows={4} />
      ) : products.error ? (
        <AdminError message="Produkte konnten nicht geladen werden." onRetry={() => void products.refetch()} />
      ) : (products.data ?? []).length === 0 ? (
        <AdminNotice title="Keine Produkte vorhanden" description="Lege dein erstes Produkt als Entwurf an." />
      ) : rows.length === 0 ? (
        <AdminNotice title="Keine Treffer" description="Andere Suche oder andere Filter ausprobieren." />
      ) : (
        <>
          <ul className="space-y-3">
            {page.map((p) => (
              <li key={p.id} className="glass rounded-2xl p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={productImage(p.id, p.image_url)}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{p.type}</span>
                      <span>{money(effectivePrice(Number(p.base_price), p.sale_price as number | null), p.currency)}</span>
                      <span>{variantCount.get(p.id) ?? 0} Varianten</span>
                      {p.stock != null && <span>{p.stock} auf Lager</span>}
                      <span>Geändert {new Date(p.updated_at).toLocaleDateString("de-DE")}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px]",
                      p.status === "Veröffentlicht"
                        ? "bg-primary/15 text-primary"
                        : "border border-border text-muted-foreground",
                    )}
                  >
                    {productAvailability(p)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  <Link
                    to="/admin/products/$id/preview"
                    params={{ id: p.id }}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="size-3" /> Vorschau
                  </Link>
                  <Link
                    to="/admin/products/$id/edit"
                    params={{ id: p.id }}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3" /> Bearbeiten
                  </Link>
                  <button
                    onClick={() =>
                      action.mutate(async () => {
                        const id = await duplicateProduct(
                          p,
                          (variants.data ?? []).filter((v) => v.product_id === p.id),
                        );
                        toast.success("Als Entwurf dupliziert");
                        void navigate({ to: "/admin/products/$id/edit", params: { id } });
                      })
                    }
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="size-3" /> Duplizieren
                  </button>
                  {p.status !== "Veröffentlicht" && (
                    <button
                      onClick={() => setConfirm({ product: p, next: "Veröffentlicht" })}
                      className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      Veröffentlichen
                    </button>
                  )}
                  {p.status === "Veröffentlicht" && (
                    <button
                      onClick={() => setConfirm({ product: p, next: "Offline" })}
                      className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Offline nehmen
                    </button>
                  )}
                  {p.status !== "Archiviert" && (
                    <button
                      onClick={() => setConfirm({ product: p, next: "Archiviert" })}
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="size-3" /> Archivieren
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {visible < rows.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-border px-6 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Mehr laden ({rows.length - visible})
              </button>
            </div>
          )}
        </>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" /> Status ändern
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              „{confirm.product.name}“ auf <span className="text-foreground">{confirm.next}</span> setzen?
              {confirm.next === "Veröffentlicht"
                ? " Das Produkt wird danach öffentlich im Shop sichtbar."
                : " Das Produkt ist danach öffentlich nicht mehr sichtbar. Bestellungen bleiben erhalten."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
              >
                Abbrechen
              </button>
              <button
                onClick={() =>
                  action.mutate(async () => {
                    await setProductStatus(confirm.product.id, confirm.next as never);
                    toast.success(`Status: ${confirm.next}`);
                  })
                }
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
