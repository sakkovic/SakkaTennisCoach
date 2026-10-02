import {
  CalendarClock,
  CalendarRange,
  Inbox,
  Mail,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Settings,
  Tags,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = { label: string; href: string; icon: LucideIcon };

export const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: ListChecks },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarRange },
  { label: "Availability", href: "/admin/availability", icon: CalendarClock },
  { label: "Services", href: "/admin/services", icon: Tags },
  { label: "Locations", href: "/admin/locations", icon: MapPin },
  { label: "Journey", href: "/admin/journey", icon: Trophy },
  { label: "Messages", href: "/admin/messages", icon: Inbox },
  { label: "Emails", href: "/admin/emails", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];
