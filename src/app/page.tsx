import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";
import { api } from "@/lib/api";
import type { PerfumeSummary, CatalogueFilters } from "@/contracts/catalogue";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export default async function Home() {
  let initialItems: readonly PerfumeSummary[] | null = null;
  let filters: CatalogueFilters | null = null;
  let session: Session | null = null;
  let cart: CartDto | null = null;
  let initialError: string | null = null;

  try {
    const [listResult, filterResult, sessionResult, cartResult] = await Promise.all([
      api.catalogue.list({ page: 1, pageSize: 24 }).catch(() => ({ ok: false as const, error: { message: "Failed to load catalogue" } })),
      api.catalogue.getFilters().catch(() => ({ ok: false as const, error: { message: "Failed to load filters" } })),
      api.auth.getSession().catch(() => ({ ok: false as const })),
      api.cart.get().catch(() => ({ ok: false as const })),
    ]);

    if (listResult.ok) {
      initialItems = listResult.data.items;
    } else {
      initialError = "Failed to load catalogue items. Please try again.";
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
    initialError = "Unable to load catalogue. Please check your connection and try again.";
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <React.Suspense fallback={<div className="p-8 text-center text-text-muted">Loading catalogue...</div>}>
        <CatalogueView
          initialItems={initialItems}
          initialFilters={filters}
          initialError={initialError}
        />
      </React.Suspense>
    </CustomerShell>
  );
}
