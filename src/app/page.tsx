import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";
import { getCatalogueService } from "@/modules/catalogue/runtime";
import { api } from "@/lib/api";
import type { PerfumeSummary, CatalogueFilters } from "@/contracts/catalogue";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export default async function Home() {
  let initialItems: readonly PerfumeSummary[] = [];
  let filters: CatalogueFilters | null = null;
  let session: Session | null = null;
  let cart: CartDto | null = null;

  try {
    const catalogueService = getCatalogueService();
    const [listResult, filterResult, sessionResult, cartResult] = await Promise.all([
      catalogueService.list({ page: 1, pageSize: 24 }),
      catalogueService.getFilters(),
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ]);

    if (listResult.ok) {
      initialItems = listResult.data.items;
    }
    if (filterResult.ok) {
      filters = filterResult.data;
    }
    if (sessionResult.ok) {
      session = sessionResult.data;
    }
    if (cartResult.ok) {
      cart = cartResult.data;
    }
  } catch {
    initialItems = [];
    filters = null;
    session = null;
    cart = null;
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <React.Suspense fallback={<div className="p-8 text-center text-text-muted">Loading catalogue...</div>}>
        <CatalogueView initialItems={initialItems} initialFilters={filters} />
      </React.Suspense>
    </CustomerShell>
  );
}
