import * as React from "react";
import type { Metadata } from "next";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CheckoutView } from "@/modules/commerce/checkout-view";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export const metadata: Metadata = {
  title: "Checkout | Palermo Parfums",
  description: "Secure authenticated customer checkout.",
};

export default async function CheckoutPage() {
  let session: Session | null = null;
  let cart: CartDto | null = null;

  try {
    const [sessionResult, cartResult] = await Promise.all([
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ]);

    if (sessionResult.ok) {
      session = sessionResult.data;
    }
    if (cartResult.ok) {
      cart = cartResult.data;
    }
  } catch {
    // Graceful fallback for initial shell render
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <CheckoutView />
    </CustomerShell>
  );
}
