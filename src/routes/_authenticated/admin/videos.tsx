import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  component: AdminAdminVideos,
});

function AdminAdminVideos() {
  return (
    <>
      <AdminPageHeader title="Videos" description="Musikvideos, Visualizer und Live-Clips verwalten." />
      <ContentEditor only="videos" />
    </>
  );
}
