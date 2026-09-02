import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AccentSettings } from "@/components/admin/AccentSettings";
import { BrandSettings } from "@/components/admin/settings/BrandSettings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminAdminSettings,
});

function AdminAdminSettings() {
  return (
    <>
      <AdminPageHeader title="Site Settings" description="Globale Einstellungen der Artist-Plattform." />
      <div className="space-y-6">
        <BrandSettings />
        <AccentSettings />
      </div>
    </>
  );
}
