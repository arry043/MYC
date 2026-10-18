import {
  CalendarDaysIcon,
  ChartColumnIcon,
  LayoutGridIcon,
  ListChecksIcon,
  SettingsIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Shorter label where space is tight (phone bottom bar). */
  shortLabel?: string;
  icon: LucideIcon;
};

/** Main sections, in order. */
export const primaryNav: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutGridIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/commitments", label: "Commitments", icon: ListChecksIcon },
  { href: "/analytics", label: "Analytics", icon: ChartColumnIcon },
];

export const profileNav: NavItem = { href: "/profile", label: "Profile", icon: UserRoundIcon };
export const settingsNav: NavItem = { href: "/settings", label: "Settings", icon: SettingsIcon };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
