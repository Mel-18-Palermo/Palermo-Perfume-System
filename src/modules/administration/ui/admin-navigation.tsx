"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigationGroups, adminSections } from "./admin-sections";

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration">
      <div className="space-y-6">
        {adminNavigationGroups.map(group => (
          <section key={group} aria-labelledby={`admin-nav-${group.replaceAll(" ", "-").toLowerCase()}`}>
            <h2 id={`admin-nav-${group.replaceAll(" ", "-").toLowerCase()}`} className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{group}</h2>
            <ul className="space-y-1">
              {Object.values(adminSections).filter(section => section.group === group).map(({ href, title, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-label transition-colors ${
                  active
                    ? "bg-primary font-semibold text-primary-text"
                    : "text-text hover:bg-surface-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{title}</span>
              </Link>
            </li>
          );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
