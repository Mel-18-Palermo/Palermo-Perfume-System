"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const user = session?.user;
  const navigationClassName = (href: string) =>
    `flex min-h-[44px] items-center text-base font-medium text-text transition-colors hover:underline ${pathname === href ? "underline underline-offset-4" : ""}`;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Navigation">
      <nav className="flex flex-col space-y-4" aria-label="Mobile Navigation">
        <Link
          href="/catalogue"
          onClick={onClose}
          className={navigationClassName("/catalogue")}
          aria-current={pathname === "/catalogue" ? "page" : undefined}
        >
          Catalogue
        </Link>
        <Link
          href="/quiz"
          onClick={onClose}
          className={navigationClassName("/quiz")}
          aria-current={pathname === "/quiz" ? "page" : undefined}
        >
          Consultation
        </Link>
        <Link
          href="/cart"
          onClick={onClose}
          className={navigationClassName("/cart")}
          aria-current={pathname === "/cart" ? "page" : undefined}
        >
          Cart
        </Link>
        <Link href="/wishlist" onClick={onClose} className={navigationClassName("/wishlist")} aria-current={pathname === "/wishlist" ? "page" : undefined}>
          Wishlist
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
                className={navigationClassName("/account")}
                aria-current={pathname === "/account" ? "page" : undefined}
              >
                Account
              </Link>
              <Link
                href="/orders"
                onClick={onClose}
                className={navigationClassName("/orders")}
                aria-current={pathname === "/orders" ? "page" : undefined}
              >
                Orders
              </Link>
              <Link href="/account/rewards" onClick={onClose} className={navigationClassName("/account/rewards")} aria-current={pathname === "/account/rewards" ? "page" : undefined}>
                Rewards &amp; referrals
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
                className={navigationClassName("/login")}
                aria-current={pathname === "/login" ? "page" : undefined}
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className={navigationClassName("/signup")}
                aria-current={pathname === "/signup" ? "page" : undefined}
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
