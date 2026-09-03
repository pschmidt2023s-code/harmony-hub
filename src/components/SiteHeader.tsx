import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart";
import { usePublicSections } from "@/lib/public-nav";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const cart = useCart();
  const sections = usePublicSections();

  /**
   * Phase 17: Die öffentliche Navigation zeigt ausschließlich Bereiche mit
   * echtem, veröffentlichtem Inhalt. Kommen später Videos, Produkte oder
   * Tourdaten dazu, erscheinen die Einträge automatisch wieder.
   */
  const NAV: { to: "/" | "/musik" | "/videos" | "/shop" | "/tour" | "/ueber-mich"; label: string }[] = [
    { to: "/", label: "Start" },
    ...(sections.hasMusic ? ([{ to: "/musik", label: "Musik" }] as const) : []),
    ...(sections.hasVideos ? ([{ to: "/videos", label: "Videos" }] as const) : []),
    ...(sections.hasShop ? ([{ to: "/shop", label: "Shop" }] as const) : []),
    ...(sections.hasTour ? ([{ to: "/tour", label: "Tour" }] as const) : []),
    { to: "/ueber-mich", label: "Über" },
  ];

  // Menü bei Escape schließen und Hintergrund-Scroll sperren, solange es offen ist.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass-strong" : "bg-transparent",
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:px-8">
        <Link to="/" className="min-w-0 text-lg font-semibold tracking-[0.35em]">
          TAYO
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={user ? "/konto" : "/auth"}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="size-4" /> {user ? "Konto" : "Login"}
          </Link>
          {cart.count > 0 && (
            <Link
              to="/checkout"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShoppingBag className="size-4" /> {cart.count}
            </Link>
          )}
          <Link
            to="/shop"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
          >
            Merch
          </Link>
        </nav>
        <div className="flex items-center gap-1 lg:hidden">
          {cart.count > 0 && (
            <Link
              to="/checkout"
              aria-label={`Warenkorb, ${cart.count} Artikel`}
              className="relative grid min-h-11 min-w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShoppingBag className="size-5" />
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {cart.count}
              </span>
            </Link>
          )}
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-full"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="glass-strong flex max-h-[calc(100dvh-4.5rem)] animate-fade-in flex-col gap-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={user ? "/konto" : "/auth"}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {user ? "Mein Konto" : "Login / Registrieren"}
          </Link>
          <Link
            to="/shop"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-base font-medium text-primary-foreground"
          >
            Merch
          </Link>
        </nav>
      )}
    </header>
  );
}