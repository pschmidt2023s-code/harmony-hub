import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { adminReleasesQueryOptions, adminSongsQueryOptions } from "@/lib/admin/releases";
import { adminVideoListQueryOptions, sourceLabel, videoAvailability } from "@/lib/admin/videos";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/videos/$id/preview")({
  component: VideoPreviewPage,
});

/** Reine Vorschau — es wird nichts gespeichert und nichts veröffentlicht. */
function VideoPreviewPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminVideoListQueryOptions);
  const releases = useQuery(adminReleasesQueryOptions);
  const songs = useQuery(adminSongsQueryOptions);

  if (isLoading) return <AdminSkeleton rows={5} />;
  if (error) return <AdminError message="Video konnte nicht geladen werden." onRetry={() => void refetch()} />;

  const video = (data ?? []).find((v) => v.id === id);
  if (!video) return <AdminError message="Dieses Video existiert nicht." />;

  const release = video.release_id ? (releases.data ?? []).find((r) => r.id === video.release_id) : undefined;
  const song = video.song_id ? (songs.data ?? []).find((s) => s.id === video.song_id) : undefined;

  return (
    <div className="min-w-0 pb-16">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/videos" className="text-sm text-muted-foreground hover:text-primary">
          ← Videos
        </Link>
        <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-primary">
          Admin Preview — nicht öffentlich
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {videoAvailability(video)}
        </span>
      </div>

      <div className="max-w-4xl">
        <VideoPlayer source={video.source} url={video.video_url} poster={video.thumb_url} title={video.title} />
      </div>

      <div className="glass mt-5 max-w-4xl rounded-2xl p-5 md:p-6">
        <p className="text-xs uppercase tracking-widest text-primary">
          {video.category} · {sourceLabel(video.source)}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase">{video.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(video.video_date)}
          {release ? ` · ${release.title}` : ""}
          {song ? ` · ${song.title}` : ""}
        </p>
        {video.description && <p className="mt-4 text-sm leading-relaxed">{video.description}</p>}
        <Link
          to="/admin/videos/$id/edit"
          params={{ id: video.id }}
          className="glass mt-6 inline-flex rounded-full px-5 py-2.5 text-sm hover:text-primary"
        >
          Bearbeiten
        </Link>
      </div>
    </div>
  );
}
