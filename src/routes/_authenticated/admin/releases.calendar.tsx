import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/releases/calendar")({
  component: AdminAdminReleasesCalendar,
});

function AdminAdminReleasesCalendar() {
  return (
    <>
      <AdminPageHeader title="Release Calendar" description="Zeitplan aller geplanten und veröffentlichten Releases." />
      <AdminNotice title="In Arbeit" description="Dieser Bereich wird in einer späteren Phase umgesetzt." />
    </>
  );
}
