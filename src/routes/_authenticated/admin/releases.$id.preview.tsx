import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AdminError } from "@/components/admin/AdminPageHeader";
import { ReleaseLanding } from "@/components/release/ReleaseLanding";
import { contentQueryOptions } from "@/lib/content";

export const Route = createFileRoute("/_authenticated/admin/releases/$id/preview")({
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(contentQueryOptions);
  const release = data.releases.find((r) => r.id === id);

  if (!release) return <AdminError message="Dieses Release existiert nicht." />;

  return (
    <div className="min-w-0">
      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Vorschau — {release.isPublic ? "öffentlich sichtbar" : "noch nicht öffentlich"}
        </p>
        <div className="flex gap-3">
          <Link
            to="/admin/releases/$id/edit"
            params={{ id: release.id }}
            className="glass rounded-full px-4 py-2 text-sm hover:text-primary"
          >
            Bearbeiten
          </Link>
          <Link to="/admin/releases" className="glass rounded-full px-4 py-2 text-sm hover:text-primary">
            Zurück
          </Link>
        </div>
      </div>
      <div className="-mx-5 overflow-hidden rounded-2xl border border-border/60 md:-mx-6">
        <ReleaseLanding release={release} content={data} />
      </div>
    </div>
  );
}
