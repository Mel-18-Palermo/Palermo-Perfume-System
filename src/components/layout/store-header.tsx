"use client";

import * as React from "react";
import Link from "next/link";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

interface StoreHeaderProps {
  onOpenMobileNav: () => void;
  cart?: CartDto | null;
  session?: Session | null;
}

export function StoreHeader({ onOpenMobileNav, cart, session }: StoreHeaderProps) {
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
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2 min-h-[44px]">
            <span className="text-h3 font-bold tracking-tight text-text">PALERMO</span>
            <span className="text-xs uppercase tracking-widest text-accent font-medium hidden sm:inline">Parfums</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-4" aria-label="Main Navigation">
            <Link href="/catalogue" className="text-sm font-medium text-text hover:text-accent transition-colors">
              Catalogue
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-xs text-text-muted hidden sm:inline">
              {user.displayName}
            </span>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-text-muted hover:text-text transition-colors"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/cart"
            className="min-h-[44px] px-3 py-2 inline-flex items-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-muted text-text text-sm font-medium transition-colors"
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent text-[12px] font-bold text-surface">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
