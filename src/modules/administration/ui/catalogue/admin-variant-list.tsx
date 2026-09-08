"use client";

import * as React from "react";
import type { AdminPerfume } from "@/contracts/admin";
import type { PerfumeVariantSummary } from "@/contracts/catalogue";
import { AdminVariantForm } from "./admin-variant-form";
import { AdminBadge, AdminButton, AdminEmptyState } from "./admin-ui-kit";

type ViewState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; variant: PerfumeVariantSummary };

const availabilityStatus: Record<PerfumeVariantSummary["availability"], "active" | "warning" | "archived"> = {
  AVAILABLE: "active",
  OUT_OF_STOCK: "warning",
  UNAVAILABLE: "archived",
};

const availabilityLabel: Record<PerfumeVariantSummary["availability"], string> = {
  AVAILABLE: "Available",
  OUT_OF_STOCK: "Out of stock",
  UNAVAILABLE: "Unavailable",
};

export interface AdminVariantListProps {
  perfume: AdminPerfume;
  onVariantSaved?: (variant: PerfumeVariantSummary) => void;
}

export function AdminVariantList({ perfume, onVariantSaved }: AdminVariantListProps) {
  const [variants, setVariants] = React.useState<readonly PerfumeVariantSummary[]>(perfume.perfume.variants);
  const [view, setView] = React.useState<ViewState>({ mode: "list" });

  const handleSaved = (variant: PerfumeVariantSummary) => {
    setVariants(current => {
      const exists = current.some(item => item.id === variant.id);
      return exists ? current.map(item => (item.id === variant.id ? variant : item)) : [...current, variant];
    });
    setView({ mode: "list" });
    onVariantSaved?.(variant);
  };

  if (view.mode === "create" || view.mode === "edit") {
    const optionalProps = view.mode === "edit" ? { initialVariant: view.variant } : {};
    return (
      <AdminVariantForm
        mode={view.mode}
        perfumeId={perfume.perfume.id}
        perfumeRevision={perfume.revision}
        defaultCurrency={perfume.perfume.priceFrom.currency}
        onSaved={handleSaved}
        onCancel={() => setView({ mode: "list" })}
        {...optionalProps}
      />
    );
  }

  return (
    <section aria-labelledby="admin-variant-list-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 id="admin-variant-list-heading" className="text-h3 font-semibold">
          Variants
        </h3>
        <AdminButton size="sm" onClick={() => setView({ mode: "create" })}>
          Add variant
        </AdminButton>
      </div>

      {variants.length === 0 ? (
        <AdminEmptyState
          title="No variants yet"
          description="Variants you add will appear here."
          action={<AdminButton size="sm" onClick={() => setView({ mode: "create" })}>Add your first variant</AdminButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-label text-text-muted">
                <th scope="col" className="px-4 py-3">SKU</th>
                <th scope="col" className="px-4 py-3">Bottle</th>
                <th scope="col" className="px-4 py-3">Price</th>
                <th scope="col" className="px-4 py-3">Availability</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(variant => (
                <tr key={variant.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{variant.sku}</td>
                  <td className="px-4 py-3 text-text-muted">{variant.bottleSize} · {variant.concentration}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {(variant.price.amountMinor / 100).toFixed(2)} {variant.price.currency}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge status={availabilityStatus[variant.availability]}>
                      {availabilityLabel[variant.availability]}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton variant="secondary" size="sm" onClick={() => setView({ mode: "edit", variant })}>
                      Edit
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
