import {
  BarChart3,
  CalendarRange,
  Disc3,
  Image,
  LayoutDashboard,
  ListMusic,
  Mail,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Users,
  UserCog,
  Video,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/releases", label: "Releases", icon: Disc3 },
      { to: "/admin/songs", label: "Songs", icon: ListMusic },
      { to: "/admin/videos", label: "Videos", icon: Video },
      { to: "/admin/media", label: "Media Library", icon: Image },
    ],
  },
  {
    label: "Releases",
    items: [
      { to: "/admin/releases/pipeline", label: "Release Pipeline", icon: Workflow },
      { to: "/admin/releases/calendar", label: "Release Calendar", icon: CalendarRange },
    ],
  },
  {
    label: "Audience",
    items: [
      { to: "/admin/fans", label: "Fans", icon: Users },
      { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    label: "Commerce",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Analytics",
    items: [{ to: "/admin/analytics", label: "Overview", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Site Settings", icon: Settings },
      { to: "/admin/seo", label: "SEO", icon: Search },
      { to: "/admin/users", label: "Admin Users", icon: UserCog },
    ],
  },
];
