"use client";

import * as React from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

interface CustomerShellProps {
  children: React.ReactNode;
  cartCount?: number;
}

export function CustomerShell({ children, cartCount = 0 }: CustomerShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <StoreHeader
        onOpenMobileNav={() => setMobileNavOpen(true)}
        cartCount={cartCount}
      />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <StoreFooter />

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Persistent Floating Concierge Quick Launcher */}
      <aside className="fixed bottom-6 right-6 z-40" aria-label="Quick Support Access">
        <Link href="/support">
          <Button
            size="sm"
            className="shadow-xl rounded-full px-4 py-2 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center border border-border"
            aria-label="Open Customer Support Concierge"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Concierge
          </Button>
        </Link>
      </aside>
    </div>
  );
}