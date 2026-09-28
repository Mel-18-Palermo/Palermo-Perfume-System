"use client";

import { useEffect, useState } from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import type { CartDto } from "@/contracts/cart";
import type { Session } from "@/contracts/auth";
import { api } from "@/lib/api";
import { SupportAssistance } from "@/modules/support/ui/support-assistance";

export default function SupportPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ]).then(([sessionResult, cartResult]) => {
      if (!active) return;
      if (sessionResult.ok) setSession(sessionResult.data);
      if (cartResult.ok) setCart(cartResult.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <CustomerShell cart={cart} session={session} isLoading={loading}><SupportAssistance session={session} sessionLoading={loading} /></CustomerShell>;
}
