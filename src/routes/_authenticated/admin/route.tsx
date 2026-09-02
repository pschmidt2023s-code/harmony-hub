import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar, AdminTopBar, useAdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSkeleton } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Control Center — TAYO Admin" },
      { name: "description", content: "Interne Verwaltung der TAYO Artist-Plattform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { open, setOpen } = useAdminSidebar();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <AdminSkeleton rows={4} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Kein Zugriff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Bereich ist dem Artist-Team vorbehalten.
          </p>
        </div>
      </div>
    );
  }

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
