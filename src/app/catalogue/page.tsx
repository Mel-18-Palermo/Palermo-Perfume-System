import * as React from "react";
import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { CatalogueFilters, PerfumeSummary } from "@/contracts/catalogue";
import { api } from "@/lib/api";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";

export const metadata: Metadata = {
  title: "Fragrance catalogue | Palermo",
  description: "Explore Palermo fragrances by family, intensity, and price.",
};

export default async function CataloguePage() {
  let initialItems: readonly PerfumeSummary[] | null = null;
  let filters: CatalogueFilters | null = null;
  let session: Session | null = null;
  let cart: CartDto | null = null;
  let initialError: string | null = null;

  try {
    const [listResult, filterResult, sessionResult, cartResult] =
      await Promise.all([
        api.catalogue
          .list({ page: 1, pageSize: 24 })
          .catch(() => ({
            ok: false as const,
            error: { message: "Failed to load catalogue" },
          })),
        api.catalogue
          .getFilters()
          .catch(() => ({
            ok: false as const,
            error: { message: "Failed to load filters" },
          })),
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
    initialError =
      "Unable to load catalogue. Please check your connection and try again.";
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <React.Suspense
        fallback={
          <div className="p-8 text-center text-text-muted">
            Loading catalogue...
          </div>
        }
      >
        <CatalogueView
          initialItems={initialItems}
          initialFilters={filters}
          initialError={initialError}
        />
      </React.Suspense>
    </CustomerShell>
  );
}
