import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminNotice, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { adminProductQueryOptions } from "@/lib/admin/products";

export const Route = createFileRoute("/_authenticated/admin/products/$id/edit")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminProductQueryOptions(id));

  return (
    <>
      <AdminPageHeader
        title={data?.product?.name || "Produkt bearbeiten"}
        description="Produktdaten, Preise, Varianten, Medien und SEO."
      />
      {isLoading ? (
        <AdminSkeleton rows={4} />
      ) : error ? (
        <AdminError message="Produkt konnte nicht geladen werden." onRetry={() => void refetch()} />
      ) : !data?.product ? (
        <AdminNotice title="Nicht gefunden" description="Dieses Produkt existiert nicht (mehr)." />
      ) : (
        <ProductEditor mode="update" product={data.product} variants={data.variants} />
      )}
    </>
  );
}
