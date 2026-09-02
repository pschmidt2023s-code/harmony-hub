import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const Route = createFileRoute("/_authenticated/admin/releases/")({
  component: AdminAdminReleases,
});

function AdminAdminReleases() {
  return (
    <>
      <AdminPageHeader title="Releases" description="TAYO Releases und Release-Metadaten verwalten." />
      <ContentEditor only="releases" />
    </>
  );
}
