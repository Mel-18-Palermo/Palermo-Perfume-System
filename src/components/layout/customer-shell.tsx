"use client";

import * as React from "react";
import { StoreHeader } from "./store-header";
import { StoreFooter } from "./store-footer";
import { MobileNav } from "./mobile-nav";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export interface CustomerShellProps {
  children: React.ReactNode;
  cart?: CartDto | null;
  session?: Session | null;
  isLoading?: boolean;
}

export function CustomerShell({
  children,
  cart = null,
  session = null,
  isLoading = false,
}: CustomerShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <StoreHeader
        cart={cart}
        session={session}
        isLoading={isLoading}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <MobileNav
        isOpen={mobileNavOpen}
        session={session}
        isLoading={isLoading}
        onClose={() => setMobileNavOpen(false)}
      />
      <main className="mx-auto flex-1 w-full max-w-[var(--container-wide)] px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
