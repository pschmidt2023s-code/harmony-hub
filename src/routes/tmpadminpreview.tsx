import { createFileRoute } from "@tanstack/react-router";
import { AdminNotice, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSidebar, AdminTopBar, useAdminSidebar } from "@/components/admin/AdminSidebar";

export const Route = createFileRoute("/tmpadminpreview")({ component: P });

function P() {
  const { open, setOpen } = useAdminSidebar();
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <AdminTopBar onOpen={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <AdminPageHeader title="TAYO Control Center" description="Überblick über Releases, Katalog, Bestellungen und Fans." />
          <AdminNotice title="Vorschau" description="Layout-Vorschau der Admin-Shell." />
        </main>
      </div>
    </div>
  );
}
