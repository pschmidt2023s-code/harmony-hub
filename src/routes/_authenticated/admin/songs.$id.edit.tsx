import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { SongEditor } from "@/components/admin/songs/SongEditor";
import { adminSongListQueryOptions } from "@/lib/admin/songs";

export const Route = createFileRoute("/_authenticated/admin/songs/$id/edit")({
  component: EditSongPage,
});

function EditSongPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminSongListQueryOptions);

  if (isLoading) return <AdminSkeleton rows={6} />;
  if (error) return <AdminError message="Song konnte nicht geladen werden." onRetry={() => void refetch()} />;

  const song = (data ?? []).find((s) => s.id === id);
  if (!song) return <AdminError message="Dieser Song existiert nicht." />;

  return <SongEditor key={song.id} mode="edit" initial={song} />;
}
