import { createFileRoute } from "@tanstack/react-router";
import { ReleaseEditor } from "@/components/admin/releases/ReleaseEditor";

export const Route = createFileRoute("/_authenticated/admin/releases/new")({
  component: () => <ReleaseEditor mode="new" />,
});
