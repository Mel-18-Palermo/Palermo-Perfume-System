"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminSections } from "./admin-sections";

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-1">
        {Object.values(adminSections).map(({ href, title }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center rounded-md px-4 py-3 text-label ${
                  active
                    ? "bg-primary font-semibold text-primary-text"
                    : "text-text hover:bg-surface-muted"
                }`}
              >
                <span className={active ? "text-primary-text" : "text-text"}>
                  {title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
