import * as React from "react";
import Link from "next/link";
import type { Session } from "@/contracts/auth";

export function StoreFooter({ session }: { session: Session | null }) {
  const isAuthenticated = Boolean(session?.user);

  return (
    <footer className="mt-auto w-full border-t border-border bg-surface">
      <div className="mx-auto max-w-[var(--container-wide)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]">
          <div className="max-w-reading">
            <span className="text-h3 font-bold tracking-tight text-text">PALERMO</span>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">Modern fragrance, considered through a personal consultation and a focused catalogue.</p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="text-xs font-semibold uppercase tracking-wider text-text">Explore</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Link href="/catalogue" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Catalogue</Link>
              <Link href="/quiz" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Consultation</Link>
              {isAuthenticated ? <><Link href="/account" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Account</Link><Link href="/orders" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Orders</Link></> : <Link href="/login" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Account</Link>}
              <Link href="/cart" className="min-h-[44px] py-2 text-text-muted transition-colors hover:text-text">Cart</Link>
            </div>
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Palermo Perfume System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
