import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: AdminAdminNewsletter,
});

function AdminAdminNewsletter() {
  return (
    <>
      <AdminPageHeader title="Newsletter" description="Abonnenten verwalten und exportieren." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
