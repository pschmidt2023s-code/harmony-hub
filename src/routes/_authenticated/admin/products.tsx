import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminAdminProducts,
});

function AdminAdminProducts() {
  return (
    <>
      <AdminPageHeader title="Products" description="Merch-Produkte, Varianten und Bestand." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
