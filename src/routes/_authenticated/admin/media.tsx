import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: AdminAdminMedia,
});

function AdminAdminMedia() {
  return (
    <>
      <AdminPageHeader title="Media Library" description="Cover, Thumbnails, Audio- und Videodateien." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
