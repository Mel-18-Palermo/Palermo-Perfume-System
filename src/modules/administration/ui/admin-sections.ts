import type { LucideIcon } from "lucide-react";
import { Boxes, ChartNoAxesCombined, LayoutDashboard, MessageSquareText, PackageSearch, ShieldCheck, Tags } from "lucide-react";

export const adminSections = {
  dashboard: {
    href: "/admin",
    title: "Dashboard",
    description: "Dashboard summaries will appear here when connected.",
    group: "Overview",
    icon: LayoutDashboard,
  },
  catalogue: {
    href: "/admin/catalogue",
    title: "Catalogue",
    description: "Product and variant management will appear here.",
    group: "Catalogue & stock",
    icon: PackageSearch,
  },
  inventory: {
    href: "/admin/inventory",
    title: "Inventory",
    description: "Inventory and production-batch information will appear here.",
    group: "Catalogue & stock",
    icon: Boxes,
  },
  promotions: {
    href: "/admin/promotions",
    title: "Promotions",
    description: "Promotion management will appear here.",
    group: "Administration",
    icon: Tags,
  },
  reviews: {
    href: "/admin/reviews",
    title: "Reviews",
    description: "The review moderation queue will appear here.",
    group: "Administration",
    icon: MessageSquareText,
  },
  reporting: {
    href: "/admin/reporting",
    title: "Reporting",
    description: "Approved reports will appear here when connected.",
    group: "Administration",
    icon: ChartNoAxesCombined,
  },
  security: {
    href: "/admin/security",
    title: "Security",
    description: "Administrator authentication and passkey management.",
    group: "Administration",
    icon: ShieldCheck,
  },
} as const;

export type AdminSection = keyof typeof adminSections;
export type AdminNavigationGroup = "Overview" | "Catalogue & stock" | "Administration";
export type AdminNavigationItem = Readonly<{
  href: string;
  title: string;
  group: AdminNavigationGroup;
  icon: LucideIcon;
}>;

export const adminNavigationGroups: readonly AdminNavigationGroup[] = ["Overview", "Catalogue & stock", "Administration"];
