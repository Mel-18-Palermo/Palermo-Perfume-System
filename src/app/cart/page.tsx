"use client";

import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CartView } from "@/modules/commerce/cart-view";
import { api } from "@/lib/api";
import type { CartDto } from "@/contracts/cart";
import type { Session } from "@/contracts/auth";

export default function CartPage() {
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [initialized, setInitialized] = React.useState(false);
  const [initialError, setInitialError] = React.useState<string | null>(null);

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
          setInitialError(null);
        } else {
          setInitialError(cartRes.error?.message || "Failed to load shopping cart.");
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
      <CartView
        initialCart={cart}
        initialError={initialError}
        initialLoading={!initialized}
        onCartChange={setCart}
      />
    </CustomerShell>
  );
}