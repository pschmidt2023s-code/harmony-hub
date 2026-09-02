import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/fans")({
  component: AdminAdminFans,
});

function AdminAdminFans() {
  return (
    <>
      <AdminPageHeader title="Fans" description="Registrierte Fan-Accounts und Favoriten." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
