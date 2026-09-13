import * as React from "react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CatalogueView } from "@/modules/catalogue/catalogue-view";
import { getCatalogueService } from "@/modules/catalogue/runtime";
import { api } from "@/lib/api";
import type { PerfumeSummary, CatalogueFilters } from "@/contracts/catalogue";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

const MOCK_ITEMS: readonly PerfumeSummary[] = [
  {
    id: "perfume-01",
    slug: "sicilian-bergamot",
    name: "Sicilian Bergamot & Neroli",
    primaryFamily: { id: "citrus", label: "Citrus" },
    imageUrl: null,
    priceFrom: { amountMinor: 14500, currency: "AUD" },
    intensity: { id: "eau-de-parfum", label: "Eau de Parfum" },
  },
  {
    id: "perfume-02",
    slug: "tuscan-leather",
    name: "Tuscan Leather & Cedarwood",
    primaryFamily: { id: "woody", label: "Woody" },
    imageUrl: null,
    priceFrom: { amountMinor: 18500, currency: "AUD" },
    intensity: { id: "parfum", label: "Parfum" },
  },
  {
    id: "perfume-03",
    slug: "florentine-rose",
    name: "Florentine Rose & Velvet Amber",
    primaryFamily: { id: "floral", label: "Floral" },
    imageUrl: null,
    priceFrom: { amountMinor: 16000, currency: "AUD" },
    intensity: { id: "eau-de-parfum", label: "Eau de Parfum" },
  },
  {
    id: "perfume-04",
    slug: "amalfi-marine",
    name: "Amalfi Coast Marine Mist",
    primaryFamily: { id: "fresh", label: "Fresh" },
    imageUrl: null,
    priceFrom: { amountMinor: 13500, currency: "AUD" },
    intensity: { id: "eau-de-toilette", label: "Eau de Toilette" },
  },
  {
    id: "perfume-05",
    slug: "venetian-spices",
    name: "Venetian Spices & Tobacco",
    primaryFamily: { id: "oriental", label: "Oriental" },
    imageUrl: null,
    priceFrom: { amountMinor: 19500, currency: "AUD" },
    intensity: { id: "parfum", label: "Parfum" },
  },
  {
    id: "perfume-06",
    slug: "calabrian-mandarin",
    name: "Calabrian Mandarin & Basil",
    primaryFamily: { id: "citrus", label: "Citrus" },
    imageUrl: null,
    priceFrom: { amountMinor: 14000, currency: "AUD" },
    intensity: { id: "eau-de-toilette", label: "Eau de Toilette" },
  },
];

const MOCK_FILTERS: CatalogueFilters = {
  currency: "AUD",
  family: [
    { id: "citrus", label: "Citrus" },
    { id: "floral", label: "Floral" },
    { id: "woody", label: "Woody" },
    { id: "oriental", label: "Oriental" },
    { id: "fresh", label: "Fresh" },
  ],
  note: [
    { id: "bergamot", label: "Bergamot", description: "Fresh and crisp" },
    { id: "rose", label: "Rose", description: "Velvet floral" },
    { id: "cedarwood", label: "Cedarwood", description: "Warm woody base" },
    { id: "neroli", label: "Neroli", description: "Bright aromatic" },
  ],
  collection: [
    { id: "classic", label: "Classic Heritage" },
    { id: "private", label: "Private Reserve" },
  ],
  intensity: [
    { id: "eau-de-toilette", label: "Eau de Toilette" },
    { id: "eau-de-parfum", label: "Eau de Parfum" },
    { id: "parfum", label: "Parfum" },
  ],
  occasion: [
    { id: "evening", label: "Evening & Gala" },
    { id: "daily", label: "Daily Signature" },
  ],
  mood: [
    { id: "confident", label: "Confident" },
    { id: "serene", label: "Serene" },
  ],
  weather: [
    { id: "warm", label: "Warm & Sunny" },
    { id: "cool", label: "Cool & Crisp" },
  ],
};

export default async function Home() {
  let initialItems: readonly PerfumeSummary[] = MOCK_ITEMS;
  let filters: CatalogueFilters | null = MOCK_FILTERS;
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

    if (listResult.ok && listResult.data.items.length > 0) {
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
    // Keep fallback mock data for local rendering when database is offline
  }

  return (
    <CustomerShell cart={cart} session={session}>
      <React.Suspense fallback={<div className="p-8 text-center text-text-muted">Loading catalogue...</div>}>
        <CatalogueView initialItems={initialItems} initialFilters={filters} />
      </React.Suspense>
    </CustomerShell>
  );
}
