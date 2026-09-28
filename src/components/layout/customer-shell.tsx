"use client";

import * as React from "react";
import { StoreHeader } from "./store-header";
import { StoreFooter } from "./store-footer";
import { MobileNav } from "./mobile-nav";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import { api } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { FloatingConcierge } from "@/modules/support/ui/floating-concierge";
import { AccountHub } from "./account-hub";

export interface CustomerShellProps {
  children: React.ReactNode;
  cart: CartDto | null;
  session: Session | null;
  isLoading?: boolean;
  contentLayout?: "contained" | "full-bleed";
}

export function CustomerShell({
  children,
  cart,
  session,
  isLoading = false,
  contentLayout = "contained",
}: CustomerShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [hasLoggedOut, setHasLoggedOut] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState<string | null>(null);
  const currentSession = hasLoggedOut ? null : session;
  const currentCart = hasLoggedOut ? null : cart;

  const handleLogout = React.useCallback(async (): Promise<boolean> => {
    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      const result = await api.auth.logout();
      if (!result.ok) {
        setLogoutError(result.error.message || "Unable to log out. Please try again.");
        return false;
      }

      setHasLoggedOut(true);
      setMobileNavOpen(false);
      router.replace("/");
      router.refresh();
      return true;
    } catch {
      setLogoutError("Unable to log out. Please check your connection and try again.");
      return false;
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <StoreHeader
        cart={currentCart}
        session={currentSession}
        isLoading={isLoading}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        onLogout={handleLogout}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <MobileNav
        isOpen={mobileNavOpen}
        session={currentSession}
        isLoading={isLoading}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        onLogout={handleLogout}
        onClose={() => setMobileNavOpen(false)}
      />
      <main
        className={
          contentLayout === "full-bleed"
            ? "w-full flex-1"
            : "mx-auto w-full max-w-[var(--container-wide)] flex-1 px-4 py-8 sm:px-6 lg:px-8"
        }
      >
        {pathname === "/account" && <AccountHub />}
        {children}
      </main>
      {pathname !== "/support" && <FloatingConcierge session={currentSession} sessionLoading={isLoading} />}
      <StoreFooter session={currentSession} />
    </div>
  );
}
