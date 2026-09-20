import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { CustomerShell } from "@/components/layout/customer-shell";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { CatalogueFilters, PerfumeSummary } from "@/contracts/catalogue";
import { api } from "@/lib/api";
import { getCatalogueService } from "@/modules/catalogue/runtime";
import { LandingPage } from "@/modules/landing/landing-page";

const CATALOGUE_QUERY_KEYS = new Set([
  "q",
  "page",
  "pageSize",
  "note",
  "family",
  "collection",
  "minPrice",
  "maxPrice",
  "intensity",
  "occasion",
  "mood",
  "weather",
]);

type LandingAvailability = "AVAILABLE" | "OUT_OF_STOCK";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Palermo — Fragrance, reimagined",
  description:
    "Discover Palermo fragrances through luminous citrus, warm woods, and modern depth.",
};

async function getLandingCatalogue(): Promise<{
  products: readonly PerfumeSummary[];
  filters: CatalogueFilters | null;
  availabilityByProductId: Readonly<Record<string, LandingAvailability>>;
}> {
  try {
    const service = getCatalogueService();
    const [catalogueResult, filtersResult] = await Promise.all([
      service.list({ page: 1, pageSize: 6 }),
      service.getFilters(),
    ]);

    const products = catalogueResult.ok ? catalogueResult.data.items : [];
    const detailResults = await Promise.all(
      products.map((product) => service.get(product.id)),
    );
    const availabilityByProductId: Record<string, LandingAvailability> = {};

    detailResults.forEach((detailResult) => {
      if (!detailResult.ok) return;

      availabilityByProductId[detailResult.data.id] = detailResult.data.variants.some(
        (variant) => variant.availability === "AVAILABLE",
      )
        ? "AVAILABLE"
        : "OUT_OF_STOCK";
    });

    return {
      products,
      filters: filtersResult.ok ? filtersResult.data : null,
      availabilityByProductId,
    };
  } catch {
    return { products: [], filters: null, availabilityByProductId: {} };
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const legacyCatalogueParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (!CATALOGUE_QUERY_KEYS.has(key) || value === undefined) return;

    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => legacyCatalogueParams.append(key, entry));
  });

  if (legacyCatalogueParams.size > 0) {
    redirect(`/catalogue?${legacyCatalogueParams.toString()}`);
  }

  const [
    { products, filters, availabilityByProductId },
    sessionResult,
    cartResult,
  ] = await Promise.all([
    getLandingCatalogue(),
    api.auth.getSession().catch(() => ({ ok: false as const })),
    api.cart.get().catch(() => ({ ok: false as const })),
  ]);

  const session: Session | null = sessionResult.ok ? sessionResult.data : null;
  const cart: CartDto | null = cartResult.ok ? cartResult.data : null;

  return (
    <CustomerShell cart={cart} session={session} contentLayout="full-bleed">
      <LandingPage
        products={products}
        filters={filters}
        availabilityByProductId={availabilityByProductId}
      />
    </CustomerShell>
  );
}
