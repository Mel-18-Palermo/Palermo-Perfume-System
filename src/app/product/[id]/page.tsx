import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { PerfumeDetailView } from "@/modules/catalogue/perfume-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <CustomerShell cartCount={0}>
      <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading fragrance profile...</div>}>
        <PerfumeDetailView id={id} />
      </React.Suspense>
    </CustomerShell>
  );
}