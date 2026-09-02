import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminPageHeader, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { rowToDraft, VideoEditor } from "@/components/admin/videos/VideoEditor";
import { adminVideoListQueryOptions } from "@/lib/admin/videos";

export const Route = createFileRoute("/_authenticated/admin/videos/$id/edit")({
  component: EditVideoPage,
});

function EditVideoPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminVideoListQueryOptions);

  if (isLoading) return <AdminSkeleton rows={5} />;
  if (error) return <AdminError message="Video konnte nicht geladen werden." onRetry={() => void refetch()} />;

  const video = (data ?? []).find((v) => v.id === id);
  if (!video) return <AdminError message="Dieses Video existiert nicht." />;

  return (
    <>
      <AdminPageHeader title={video.title} description="Video bearbeiten." />
      <VideoEditor key={video.id} mode="update" initial={rowToDraft(video)} />
    </>
  );
}
