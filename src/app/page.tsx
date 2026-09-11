import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";
import { getCatalogueService } from "@/modules/catalogue/runtime";
import type { PerfumeSummary, CatalogueFilters } from "@/contracts/catalogue";

export default async function Home() {
  let initialItems: readonly PerfumeSummary[] = [];
  let filters: CatalogueFilters | null = null;

  try {
    const catalogueService = getCatalogueService();
    const [listResult, filterResult] = await Promise.all([
      catalogueService.list({ page: 1, pageSize: 24 }),
      catalogueService.getFilters(),
    ]);

    if (listResult.ok) {
      initialItems = listResult.data.items;
    }
    if (filterResult.ok) {
      filters = filterResult.data;
    }
  } catch {
    initialItems = [];
    filters = null;
  }

  return (
    <CustomerShell cart={null} session={null}>
      <React.Suspense fallback={<div className="p-8 text-center text-text-muted">Loading catalogue...</div>}>
        <CatalogueView initialItems={initialItems} initialFilters={filters} />
      </React.Suspense>
    </CustomerShell>
  );
}
