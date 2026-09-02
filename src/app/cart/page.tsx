import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CartView } from "@/modules/commerce/cart-view";
import { api } from "@/lib/api";
import type { CartDto } from "@/contracts/cart";
import type { Session } from "@/contracts/auth";

export const metadata = {
  title: "Shopping Bag | Palermo Parfums",
  description: "Review and manage your selected luxury fragrances and customisations.",
};

export default async function CartPage() {
  let initialCart: CartDto | null = null;
  let session: Session | null = null;

  try {
    const [cartRes, sessionRes] = await Promise.all([
      api.cart.get().catch(() => ({ ok: false as const })),
      api.auth.getSession().catch(() => ({ ok: false as const })),
    ]);

    if (cartRes.ok) {
      initialCart = cartRes.data;
    }
    if (sessionRes.ok) {
      session = sessionRes.data;
    }
  } catch {
    // Falls back to client-side load in CartView
  }

  return (
    <CustomerShell cart={initialCart} session={session}>
      <CartView initialCart={initialCart} />
    </CustomerShell>
  );
}
