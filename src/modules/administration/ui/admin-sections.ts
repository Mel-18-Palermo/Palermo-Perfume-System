export const adminSections = {
  dashboard: {
    href: "/admin",
    title: "Dashboard",
    description: "Dashboard summaries will appear here when connected.",
  },
  catalogue: {
    href: "/admin/catalogue",
    title: "Catalogue",
    description: "Product and variant management will appear here.",
  },
  inventory: {
    href: "/admin/inventory",
    title: "Inventory",
    description: "Inventory and production-batch information will appear here.",
  },
  promotions: {
    href: "/admin/promotions",
    title: "Promotions",
    description: "Promotion management will appear here.",
  },
  reviews: {
    href: "/admin/reviews",
    title: "Reviews",
    description: "The review moderation queue will appear here.",
  },
  reporting: {
    href: "/admin/reporting",
    title: "Reporting",
    description: "Approved reports will appear here when connected.",
  },
} as const;

export type AdminSection = keyof typeof adminSections;
