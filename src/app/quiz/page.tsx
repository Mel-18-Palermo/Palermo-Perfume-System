"use client";

import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { FragranceQuizView } from "@/modules/personalisation/fragrance-quiz-view";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export default function QuizPage() {
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isShellLoading, setIsShellLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let active = true;

    void Promise.all([
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ])
      .then(([sessionResult, cartResult]) => {
        if (!active) return;
        if (sessionResult.ok) setSession(sessionResult.data);
        if (cartResult.ok) setCart(cartResult.data);
      })
      .finally(() => {
        if (active) setIsShellLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CustomerShell cart={cart} session={session} isLoading={isShellLoading}>
      <FragranceQuizView />
    </CustomerShell>
  );
}
