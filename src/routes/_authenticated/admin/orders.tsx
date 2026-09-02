import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrdersPanel } from "@/components/admin/OrdersPanel";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminAdminOrders,
});

function AdminAdminOrders() {
  return (
    <>
      <AdminPageHeader title="Orders" description="Bestellungen einsehen und Status pflegen." />
      <OrdersPanel />
    </>
  );
}
