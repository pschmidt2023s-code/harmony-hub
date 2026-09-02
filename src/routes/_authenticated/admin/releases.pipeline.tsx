import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/releases/pipeline")({
  component: AdminAdminReleasesPipeline,
});

function AdminAdminReleasesPipeline() {
  return (
    <>
      <AdminPageHeader title="Release Pipeline" description="Produktionsstatus aller Releases von der Idee bis zur Veröffentlichung." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
