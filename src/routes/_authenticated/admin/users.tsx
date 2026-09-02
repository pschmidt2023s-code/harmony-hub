import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminAdminUsers,
});

function AdminAdminUsers() {
  return (
    <>
      <AdminPageHeader title="Admin Users" description="Team-Zugänge und Rollen." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
