import { createFileRoute } from "@tanstack/react-router";
import { SongEditor } from "@/components/admin/songs/SongEditor";

export const Route = createFileRoute("/_authenticated/admin/songs/new")({
  component: () => <SongEditor mode="new" />,
});
