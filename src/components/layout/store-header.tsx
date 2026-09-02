"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StoreHeaderProps {
  onOpenMobileNav: () => void;
  cartCount?: number;
}

export function StoreHeader({ onOpenMobileNav, cartCount = 0 }: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="p-2 -ml-2 rounded-md text-foreground hover:bg-surface-muted md:hidden focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Open mobile navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">PALERMO</span>
            <span className="text-xs uppercase tracking-widest text-accent font-medium hidden sm:inline">Parfums</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-4" aria-label="Main Navigation">
            <Link href="/" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Catalogue
            </Link>
            <Link href="/quiz" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fragrance Quiz
            </Link>
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              New Arrivals
            </Link>
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Best Sellers
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative" aria-label={`Shopping cart with ${cartCount} items`}>
            <Button variant="outline" size="sm" className="relative flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}