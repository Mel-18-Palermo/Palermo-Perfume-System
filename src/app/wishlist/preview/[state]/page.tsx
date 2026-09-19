import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/layout/customer-shell";
import {
  WishlistView,
  type WishlistLoadState,
} from "@/modules/participation/ui/wishlist/wishlist-view";
import type { WishlistItem } from "@/contracts/wishlist";

/**
 * QA/evidence-only harness for #255 (375/768/1440 + loading/empty/error/unavailable-item
 * screenshots). Never linked from navigation and 404s outside development, so it never
 * reaches production traffic or the real wishlist contract.
 */

const available: WishlistItem = {
  perfumeId: "demo-perfume-citrus",
  perfume: {
    id: "demo-perfume-citrus",
    slug: "sicilian-bergamot-neroli",
    name: "Sicilian Bergamot & Neroli",
    primaryFamily: { id: "family-citrus", label: "Citrus" },
    imageUrl: null,
    priceFrom: { amountMinor: 14500, currency: "AUD" },
    intensity: { id: "eau-de-parfum", label: "Eau de Parfum" },
  },
  available: true,
};

const alsoAvailable: WishlistItem = {
  perfumeId: "demo-perfume-rose",
  perfume: {
    id: "demo-perfume-rose",
    slug: "florentine-rose-amber",
    name: "Florentine Rose & Velvet Amber",
    primaryFamily: { id: "family-floral", label: "Floral" },
    imageUrl: null,
    priceFrom: { amountMinor: 16000, currency: "AUD" },
    intensity: { id: "eau-de-parfum", label: "Eau de Parfum" },
  },
  available: true,
};

const outOfStock: WishlistItem = {
  perfumeId: "demo-perfume-oud",
  perfume: {
    id: "demo-perfume-oud",
    slug: "damascus-oud-saffron",
    name: "Damascus Oud & Saffron",
    primaryFamily: { id: "family-oriental", label: "Oriental" },
    imageUrl: null,
    priceFrom: { amountMinor: 21000, currency: "AUD" },
    intensity: { id: "parfum", label: "Parfum" },
  },
  available: false,
};

const delisted: WishlistItem = {
  perfumeId: "demo-perfume-delisted",
  perfume: null,
  available: false,
};

const PREVIEW_STATES = {
  loading: { status: "loading" },
  "signed-out": { status: "signed-out" },
  error: {
    status: "error",
    message: "The wishlist service is temporarily unavailable. Please try again.",
  },
  empty: { status: "ready", items: [] },
  list: { status: "ready", items: [available, alsoAvailable] },
  unavailable: { status: "ready", items: [available, outOfStock, delisted] },
} as const satisfies Record<string, WishlistLoadState>;

type PreviewStateKey = keyof typeof PREVIEW_STATES;

function isPreviewStateKey(value: string): value is PreviewStateKey {
  return Object.hasOwn(PREVIEW_STATES, value);
}

export default async function WishlistPreviewPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { state } = await params;
  if (!isPreviewStateKey(state)) notFound();

  return (
    <CustomerShell cart={null} session={null}>
      <WishlistView previewState={PREVIEW_STATES[state]} />
    </CustomerShell>
  );
}
