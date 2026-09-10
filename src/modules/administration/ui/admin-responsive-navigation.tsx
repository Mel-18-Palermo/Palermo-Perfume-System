"use client";

import { useEffect, useRef, useState } from "react";
import { AdminNavigation } from "./admin-navigation";

export function AdminResponsiveNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
          onClick={() => setIsOpen(current => !current)}
          className="min-h-12 w-full cursor-pointer rounded-md px-4 py-3 text-left text-label font-semibold"
        >
          {isOpen ? "▼" : "▶"} Admin menu
        </button>
        {isOpen ? (
          <div
            id="admin-mobile-nav"
            ref={navRef}
            className="pt-3"
            onClick={event => {
              if (event.target instanceof Element && event.target.closest("a")) {
                close();
              }
            }}
          >
            <AdminNavigation />
          </div>
        ) : null}
      </div>
    </>
  );
}
