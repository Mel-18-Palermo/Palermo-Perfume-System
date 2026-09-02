import { CustomerShell } from "@/components/layout/customer-shell";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";
import * as React from "react";

export default function Page() {
  return (
    <CustomerShell cartCount={0}>
      <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading catalogue...</div>}>
        <CatalogueView />
      </React.Suspense>
    </CustomerShell>
  );
}