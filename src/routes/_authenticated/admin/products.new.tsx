import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { newProductId, type ProductRow } from "@/lib/admin/products";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const draft = useMemo<ProductRow>(
    () => ({
      id: newProductId(),
      name: "",
      slug: "",
      description: "",
      short_description: "",
      type: "Digital Single",
      status: "Entwurf",
      image_url: null,
      currency: "EUR",
      base_price: 0,
      sale_price: null,
      stock: null,
      is_digital: true,
      digital_asset_url: null,
      badge: null,
      release_id: null,
      song_id: null,
      video_id: null,
      seo_title: "",
      seo_description: "",
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [],
  );

  return (
    <>
      <AdminPageHeader title="Neues Produkt" description="Wird als Entwurf angelegt und ist nicht öffentlich." />
      <ProductEditor mode="insert" product={draft} variants={[]} />
    </>
  );
}
