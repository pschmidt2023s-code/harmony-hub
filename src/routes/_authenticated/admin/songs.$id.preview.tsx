import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Music2, Pause, Play } from "lucide-react";
import { AdminError, AdminSkeleton } from "@/components/admin/AdminPageHeader";
import { adminSongListQueryOptions, lyricsToText, type SongCredit } from "@/lib/admin/songs";
import { adminReleasesQueryOptions, isReleasePublic } from "@/lib/admin/releases";
import { toPlayerSong } from "@/components/admin/songs/SongEditor";
import { usePlayer } from "@/components/player/player-context";
import { formatDate, formatTime } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/songs/$id/preview")({
  component: SongPreviewPage,
});

function SongPreviewPage() {
  const { id } = Route.useParams();
  const player = usePlayer();
  const { data, isLoading, error, refetch } = useQuery(adminSongListQueryOptions);
  const releases = useQuery(adminReleasesQueryOptions);

  if (isLoading) return <AdminSkeleton rows={5} />;
  if (error) return <AdminError message="Song konnte nicht geladen werden." onRetry={() => void refetch()} />;

  const song = (data ?? []).find((s) => s.id === id);
  if (!song) return <AdminError message="Dieser Song existiert nicht." />;

  const release = song.release_id ? (releases.data ?? []).find((r) => r.id === song.release_id) : undefined;
  const cover = song.cover_url || release?.cover_url || "";
  const lyrics = lyricsToText((song.lyrics ?? []) as unknown as { time: number; line: string }[]).trim();
  const credits = ((song.credits ?? []) as unknown as SongCredit[]).filter((c) => c.role.trim() && c.names.trim());
  const playing = player.current?.id === song.id && player.playing;

  return (
    <div className="min-w-0 pb-16">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/songs" className="text-sm text-muted-foreground hover:text-primary">
          ← Songs
        </Link>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          Interne Vorschau — nicht öffentlich
        </span>
      </div>

      <div className="glass flex min-w-0 flex-col gap-6 rounded-2xl p-5 sm:flex-row md:p-6">
        <div className="glass grid aspect-square w-full max-w-[15rem] shrink-0 place-items-center overflow-hidden rounded-2xl">
          {cover ? (
            <img src={cover} alt="" className="size-full object-cover" />
          ) : (
            <Music2 className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold uppercase">{song.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {song.artist || "TAYO"}
            {song.duration ? ` · ${formatTime(song.duration)}` : ""}
            {song.genre ? ` · ${song.genre}` : ""}
            {song.explicit ? " · Explicit" : ""}
          </p>
          {release && (
            <p className="mt-1 text-sm text-muted-foreground">
              Release: {release.title} · {formatDate(release.release_date)} ·{" "}
              {isReleasePublic(release) ? "Live" : release.status}
            </p>
          )}
          {song.description && <p className="mt-4 text-sm leading-relaxed">{song.description}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (!song.audio_url) return;
                if (playing) player.toggle();
                else {
                  const s = toPlayerSong(song, release?.cover_url ?? undefined);
                  player.play(s, [s]);
                }
              }}
              disabled={!song.audio_url}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {song.audio_url ? "Abspielen" : "Kein Audio"}
            </button>
            <Link
              to="/admin/songs/$id/edit"
              params={{ id: song.id }}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm hover:text-primary"
            >
              Bearbeiten
            </Link>
          </div>
        </div>
      </div>

      {lyrics && (
        <div className="glass mt-5 rounded-2xl p-5 md:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Lyrics</h2>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed">{lyrics}</pre>
        </div>
      )}

      {credits.length > 0 && (
        <div className="glass mt-5 grid gap-3 rounded-2xl p-5 md:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Credits</h2>
          {credits.map((c, i) => (
            <p key={i} className="text-sm">
              <span className="text-muted-foreground">{c.role}: </span>
              {c.names}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
