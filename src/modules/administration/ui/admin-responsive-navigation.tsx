"use client";

import { useRef } from "react";

import { AdminNavigation } from "./admin-navigation";

export function AdminResponsiveNavigation() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <>
      <div className="hidden lg:block">
        <AdminNavigation />
      </div>

      <details
        ref={menuRef}
        className="lg:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuRef.current?.open) {
            event.preventDefault();
            menuRef.current.open = false;
            triggerRef.current?.focus();
          }
        }}
      >
        <summary
          ref={triggerRef}
          className="min-h-12 cursor-pointer rounded-md px-4 py-3 text-label font-semibold"
        >
          Admin menu
        </summary>

        <div
          className="pt-3"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a") &&
              menuRef.current
            ) {
              menuRef.current.open = false;
              triggerRef.current?.focus();
            }
          }}
        >
          <AdminNavigation />
        </div>
      </details>
    </>
  );
}
