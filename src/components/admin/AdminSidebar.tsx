import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_NAV } from "./nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tayo-admin-sidebar";

export function useAdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);
  return { open, setOpen };
}

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();

  // Mobile Navigation: Escape schließt, Hintergrund scrollt nicht mit.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      return !c;
    });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <>
      {open && (
        <button
          aria-label="Menü schließen"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col overflow-y-auto border-r border-border/60 bg-card/60 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <p className="text-lg font-bold tracking-[0.3em]">TAYO</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Control Center
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Menü schließen"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
            className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground lg:block"
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 px-3 pb-4">
          {ADMIN_NAV.map((group) => (
            <div key={group.label}>
              <p
                className={cn(
                  "px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70",
                  collapsed && "lg:hidden",
                )}
              >
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        title={item.label}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-border/60 px-3 py-4">
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ExternalLink className="size-4 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Website ansehen</span>
          </a>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Abmelden</span>
          </button>
        </div>
      </aside>
      <div className={cn("hidden shrink-0 lg:block", collapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]")} />
    </>
  );
}

export function AdminTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
      <button
        onClick={onOpen}
        aria-label="Menü öffnen"
        className="rounded-lg border border-border/60 p-2 text-muted-foreground"
      >
        <Menu className="size-4" />
      </button>
      <p className="text-sm font-semibold tracking-[0.2em]">TAYO</p>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Control Center
      </span>
    </div>
  );
}
