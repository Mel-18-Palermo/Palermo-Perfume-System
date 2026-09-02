"use client";

import * as React from "react";
import { StoreHeader } from "./store-header";
import { MobileNav } from "./mobile-nav";
import { StoreFooter } from "./store-footer";

export interface CustomerShellProps {
  children: React.ReactNode;
  cartCount?: number;
}

export function CustomerShell({ children, cartCount = 0 }: CustomerShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-white">
      <StoreHeader onOpenMobileNav={() => setMobileNavOpen(true)} cartCount={cartCount} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}