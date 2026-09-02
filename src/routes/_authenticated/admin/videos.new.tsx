import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { emptyVideoDraft, VideoEditor } from "@/components/admin/videos/VideoEditor";

export const Route = createFileRoute("/_authenticated/admin/videos/new")({
  component: NewVideoPage,
});

function NewVideoPage() {
  return (
    <>
      <AdminPageHeader title="Neues Video" description="Videodatensatz anlegen — Quelle, Thumbnail und Zuordnung." />
      <VideoEditor mode="insert" initial={emptyVideoDraft()} />
    </>
  );
}
