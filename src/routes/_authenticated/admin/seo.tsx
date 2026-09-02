import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  component: AdminAdminSeo,
});

function AdminAdminSeo() {
  return (
    <>
      <AdminPageHeader title="SEO" description="Metadaten, Sitemap und Suchmaschinen-Einstellungen." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
