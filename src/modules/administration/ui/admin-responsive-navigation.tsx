"use client";

import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { AdminNavigation } from "./admin-navigation";

export function AdminResponsiveNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="hidden lg:block">
        <AdminNavigation />
      </div>

      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls="admin-mobile-nav"
          onClick={() => setIsOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-left text-label font-semibold"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          Administration menu
        </button>
        <Drawer isOpen={isOpen} onClose={close} title="Administration">
          <div id="admin-mobile-nav" onClick={event => {
            if (event.target instanceof Element && event.target.closest("a")) close();
          }}>
            <AdminNavigation />
          </div>
        </Drawer>
      </div>
    </>
  );
}
