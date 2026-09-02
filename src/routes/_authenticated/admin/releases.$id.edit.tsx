import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { ReleaseEditor } from "@/components/admin/releases/ReleaseEditor";
import { adminReleasesQueryOptions } from "@/lib/admin/releases";

export const Route = createFileRoute("/_authenticated/admin/releases/$id/edit")({
  component: EditReleasePage,
});

function EditReleasePage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminReleasesQueryOptions);

  if (isLoading) return <AdminSkeleton rows={6} />;
  if (error) return <AdminError message="Release konnte nicht geladen werden." onRetry={() => void refetch()} />;

  const release = (data ?? []).find((r) => r.id === id);
  if (!release) return <AdminError message="Dieses Release existiert nicht." />;

  return <ReleaseEditor key={release.id} mode="edit" initial={release} />;
}
