import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminNotice, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { adminProductQueryOptions } from "@/lib/admin/products";
import { productImage, effectivePrice, type ShopProduct } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/products/$id/preview")({
  component: ProductPreviewPage,
});

function ProductPreviewPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminProductQueryOptions(id));
  const p = data?.product;

  const preview: ShopProduct | null = p
    ? {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.short_description,
        type: p.type,
        image: productImage(p.id, p.image_url),
        currency: p.currency,
        price: effectivePrice(Number(p.base_price), p.sale_price as number | null),
        basePrice: Number(p.base_price),
        salePrice: p.sale_price == null ? null : Number(p.sale_price),
        badge: p.badge,
        stock: p.stock,
        isDigital: p.is_digital,
        releaseId: p.release_id,
        songId: p.song_id,
        videoId: p.video_id,
        seoTitle: p.seo_title,
        seoDescription: p.seo_description,
        variants: (data?.variants ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price:
            v.price == null
              ? effectivePrice(Number(p.base_price), p.sale_price as number | null)
              : effectivePrice(Number(v.price), v.sale_price as number | null),
          available: v.available,
          stock: v.stock,
          image: v.image_url,
        })),
      }
    : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">
          Admin-Vorschau — nicht öffentlich · Status: {p?.status ?? "—"}
        </p>
        <Link
          to="/admin/products/$id/edit"
          params={{ id }}
          className="text-xs uppercase tracking-widest text-primary hover:underline"
        >
          Bearbeiten
        </Link>
      </div>
      {isLoading ? (
        <AdminSkeleton rows={3} />
      ) : error ? (
        <AdminError message="Vorschau konnte nicht geladen werden." onRetry={() => void refetch()} />
      ) : !preview ? (
        <AdminNotice title="Nicht gefunden" description="Dieses Produkt existiert nicht (mehr)." />
      ) : (
        <ProductDetail product={preview} canBuy={false} />
      )}
    </>
  );
}
