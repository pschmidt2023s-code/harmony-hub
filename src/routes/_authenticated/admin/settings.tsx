import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AccentSettings } from "@/components/admin/AccentSettings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminAdminSettings,
});

function AdminAdminSettings() {
  return (
    <>
      <AdminPageHeader title="Site Settings" description="Globale Einstellungen der Artist-Plattform." />
      <AccentSettings />
    </>
  );
}
