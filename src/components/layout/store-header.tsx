"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu } from "lucide-react";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export interface StoreHeaderProps {
  onOpenMobileNav: () => void;
  cart: CartDto | null;
  session: Session | null;
  isLoading?: boolean;
  isLoggingOut?: boolean;
  logoutError?: string | null;
  onLogout: () => Promise<boolean>;
}

export function StoreHeader({
  onOpenMobileNav,
  cart,
  session,
  isLoading = false,
  isLoggingOut = false,
  logoutError = null,
  onLogout,
}: StoreHeaderProps) {
  const pathname = usePathname();
  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  const user = session?.user;
  const navigationClassName = (href: string) =>
    `inline-flex min-h-[44px] items-center text-sm font-medium text-text transition-colors hover:underline ${pathname === href ? "underline underline-offset-4" : ""}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-[var(--container-wide)] items-center px-4 sm:px-6 lg:px-8 md:hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="-ml-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        <Link href="/" className="absolute left-1/2 flex min-h-[44px] -translate-x-1/2 items-center">
          <span className="text-h3 font-bold tracking-tight text-text">PALERMO</span>
        </Link>

        <Link
          href="/cart"
          className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          aria-label={`Shopping cart with ${itemCount} items`}
          aria-current={pathname === "/cart" ? "page" : undefined}
        >
          <ShoppingBag className="h-4 w-4 text-text" aria-hidden="true" />
          {itemCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[12px] font-bold text-primary-text">
              {itemCount}
            </span>
          )}
        </Link>
      </div>

      <div className="mx-auto hidden h-16 max-w-[var(--container-wide)] items-center justify-between px-4 sm:px-6 md:flex lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 min-h-[44px]">
            <span className="text-h3 font-bold tracking-tight text-text">PALERMO</span>
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-text lg:inline">Parfums</span>
          </Link>

          <nav className="ml-4 flex items-center gap-6" aria-label="Main Navigation">
            <Link href="/catalogue" className={navigationClassName("/catalogue")} aria-current={pathname === "/catalogue" ? "page" : undefined}>
              Catalogue
            </Link>
            <Link href="/quiz" className={navigationClassName("/quiz")} aria-current={pathname === "/quiz" ? "page" : undefined}>
              Consultation
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-xs text-text-muted">Loading...</span>
          ) : user ? (
            <>
              <Link href="/account" className="inline-flex min-h-[44px] items-center text-xs font-medium text-text transition-colors hover:underline" aria-current={pathname === "/account" ? "page" : undefined}>
                Account
              </Link>
              <Link href="/orders" className="inline-flex min-h-[44px] items-center text-xs font-medium text-text transition-colors hover:underline" aria-current={pathname === "/orders" ? "page" : undefined}>
                Orders
              </Link>
              <button
                type="button"
                onClick={() => void onLogout()}
                disabled={isLoggingOut}
                className="min-h-[44px] text-xs font-medium text-text hover:underline transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-[44px] items-center text-xs font-medium text-text transition-colors hover:underline" aria-current={pathname === "/login" ? "page" : undefined}>
                Login
              </Link>
              <Link href="/signup" className="inline-flex min-h-[44px] items-center text-xs font-medium text-text transition-colors hover:underline" aria-current={pathname === "/signup" ? "page" : undefined}>
                Sign Up
              </Link>
            </>
          )}

          <Link
            href="/cart"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
            aria-label={`Shopping cart with ${itemCount} items`}
            aria-current={pathname === "/cart" ? "page" : undefined}
          >
            <ShoppingBag className="h-4 w-4 text-text" aria-hidden="true" />
            <span>Cart</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-[12px] font-bold text-primary-text">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      {logoutError && (
        <p className="mx-auto max-w-[var(--container-wide)] px-4 pb-3 text-xs text-danger sm:px-6 lg:px-8" role="alert">
          {logoutError}
        </p>
      )}
    </header>
  );
}
