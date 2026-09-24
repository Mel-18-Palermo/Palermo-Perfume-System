"use client";

import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { WishlistClient } from "./_components/WishlistClient";
import { api } from "@/lib/api";
import type { CartDto } from "@/contracts/cart";
import type { Session } from "@/contracts/auth";

export default function WishlistPage() {
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    void Promise.all([
      api.cart.get().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unable to connect to cart service.";
        return { ok: false as const, error: { message } };
      }),
      api.auth.getSession().catch(() => ({ ok: false as const })),
    ])
      .then(([cartRes, sessionRes]) => {
        if (!active) return;
        if (cartRes.ok) {
          setCart(cartRes.data);
        }
        if (sessionRes.ok) {
          setSession(sessionRes.data);
        }
      })
      .finally(() => {
        if (active) setInitialized(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CustomerShell cart={cart} session={session} isLoading={!initialized}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Wishlist</h1>
        <WishlistClient />
      </main>
    </CustomerShell>
  );
}
