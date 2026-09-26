"use client";

import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import type { CartDto } from "@/contracts/cart";
import type { Session } from "@/contracts/auth";
import { api } from "@/lib/api";
import { CustomerParticipation } from "@/modules/participation/ui/customer-participation";

export default function RewardsPage() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { void Promise.all([api.auth.getSession(), api.cart.get()]).then(([s, c]) => { if (s.ok) setSession(s.data); if (c.ok) setCart(c.data); }).finally(() => setLoading(false)); }, []);
  return <CustomerShell session={session} cart={cart} isLoading={loading}><div className="mx-auto max-w-[1180px]"><CustomerParticipation /></div></CustomerShell>;
}
