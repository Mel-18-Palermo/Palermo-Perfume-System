import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { PerfumeDetailView } from "@/modules/catalogue/perfume-detail-view";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  let session: Session | null = null;
  let cart: CartDto | null = null;

  try {
    const [sessionResult, cartResult] = await Promise.all([
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ]);

    if (sessionResult.ok) session = sessionResult.data;
    if (cartResult.ok) cart = cartResult.data;
  } catch {
    // Non-blocking graceful shell fallback
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <React.Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Loading fragrance profile...</div>}>
        <PerfumeDetailView id={id} />
      </React.Suspense>
    </CustomerShell>
  );
}
