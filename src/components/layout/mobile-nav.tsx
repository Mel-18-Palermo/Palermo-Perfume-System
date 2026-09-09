"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import type { Session } from "@/contracts/auth";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  session?: Session | null;
}

export function MobileNav({ isOpen, onClose, session }: MobileNavProps) {
  const user = session?.user;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Navigation">
      <nav className="flex flex-col space-y-4" aria-label="Mobile Navigation">
        <Link
          href="/catalogue"
          onClick={onClose}
          className="flex min-h-[44px] items-center text-base font-medium text-text hover:text-accent transition-colors"
        >
          Catalogue
        </Link>
        {user ? (
          <div className="pt-4 border-t border-border text-xs text-text-muted">
            Signed in as <span className="font-semibold text-text">{user.displayName}</span>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            className="flex min-h-[44px] items-center text-base font-medium text-text-muted hover:text-text transition-colors pt-4 border-t border-border"
          >
            Sign In
          </Link>
        )}
      </nav>
    </Drawer>
  );
}
