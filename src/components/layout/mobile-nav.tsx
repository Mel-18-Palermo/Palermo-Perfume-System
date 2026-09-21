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
  isLoggingOut?: boolean;
  logoutError?: string | null;
  onLogout: () => Promise<boolean>;
}

export function MobileNav({
  isOpen,
  onClose,
  session,
  isLoading = false,
  isLoggingOut = false,
  logoutError = null,
  onLogout,
}: MobileNavProps) {
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
        <Link
          href="/quiz"
          onClick={onClose}
          className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
        >
          Quiz
        </Link>
        <Link
          href="/cart"
          onClick={onClose}
          className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
        >
          Cart
        </Link>
        <div className="pt-4 border-t border-border">
          {isLoading ? (
            <span className="text-xs text-text-muted">Loading account...</span>
          ) : user ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">
                Signed in as <span className="font-semibold text-text">{user.displayName}</span>
              </p>
              <Link
                href="/account"
                onClick={onClose}
                className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
              >
                Account
              </Link>
              <button
                type="button"
                onClick={() => void onLogout()}
                disabled={isLoggingOut}
                className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="flex min-h-[44px] items-center text-base font-medium text-text hover:underline transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
          {logoutError && <p className="pt-2 text-xs text-danger" role="alert">{logoutError}</p>}
        </div>
      </nav>
    </Drawer>
  );
}
