import { createFileRoute, Outlet } from "@tanstack/react-router";
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
