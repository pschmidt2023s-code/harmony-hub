import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAdminAnalytics,
});

function AdminAdminAnalytics() {
  return (
    <>
      <AdminPageHeader title="Analytics" description="Reichweite und Performance." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
