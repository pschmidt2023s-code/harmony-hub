import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const Route = createFileRoute("/_authenticated/admin/songs")({
  component: AdminAdminSongs,
});

function AdminAdminSongs() {
  return (
    <>
      <AdminPageHeader title="Songs" description="Songs, Metadaten, Lyrics und Streaming-Links verwalten." />
      <ContentEditor only="songs" />
    </>
  );
}
