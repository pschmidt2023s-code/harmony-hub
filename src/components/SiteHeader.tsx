import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Start" },
  { to: "/musik", label: "Musik" },
  { to: "/videos", label: "Videos" },
  { to: "/shop", label: "Shop" },
  { to: "/tour", label: "Tour" },
  { to: "/ueber-mich", label: "Über" },
  { to: "/kontakt", label: "Kontakt" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const cart = useCart();

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
        <button
          className="lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menü öffnen"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <nav className="glass-strong flex animate-fade-in flex-col gap-1 px-5 pb-6 lg:hidden">
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
        </nav>
      )}
    </header>
  );
}