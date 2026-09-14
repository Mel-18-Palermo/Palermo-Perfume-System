"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import type { Session } from "@/contracts/auth";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  isLoading?: boolean;
}

export function MobileNav({ isOpen, onClose, session, isLoading = false }: MobileNavProps) {
  const user = session?.user;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Navigation">
      <nav className="flex flex-col space-y-4" aria-label="Mobile Navigation">
        <Link
          href="/catalogue"
          onClick={onClose}
          className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
        >
          Catalogue
        </Link>
        <div className="pt-4 border-t border-border">
          {isLoading ? (
            <span className="text-xs text-text-muted">Loading account...</span>
          ) : user ? (
            <div className="text-xs text-text-muted">
              Signed in as <span className="font-semibold text-text">{user.displayName}</span>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </Drawer>
  );
}
