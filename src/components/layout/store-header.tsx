"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, Menu } from "lucide-react";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export interface StoreHeaderProps {
  onOpenMobileNav: () => void;
  cart: CartDto | null;
  session: Session | null;
  isLoading?: boolean;
}

export function StoreHeader({ onOpenMobileNav, cart, session, isLoading = false }: StoreHeaderProps) {
  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[var(--container-wide)] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="min-h-[44px] min-w-[44px] p-2 -ml-2 flex items-center justify-center rounded-md text-text hover:bg-surface-muted md:hidden"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <Link href="/" className="flex items-center gap-2 min-h-[44px]">
            <span className="text-h3 font-bold tracking-tight text-text">PALERMO</span>
            <span className="text-xs uppercase tracking-widest text-text font-semibold hidden sm:inline">Parfums</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-4" aria-label="Main Navigation">
            <Link href="/catalogue" className="text-sm font-medium text-text hover:underline transition-colors">
              Catalogue
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-xs text-text-muted">Loading...</span>
          ) : user ? (
            <span className="text-xs text-text hidden sm:inline font-medium">
              {user.displayName}
            </span>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-text hover:underline transition-colors"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/cart"
            className="min-h-[44px] px-3 py-2 inline-flex items-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-muted text-text text-sm font-medium transition-colors"
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <ShoppingBag className="h-4 w-4 text-text" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-[12px] font-bold text-primary-text">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
