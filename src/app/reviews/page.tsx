import { CustomerShell } from "@/components/layout/customer-shell";
import { ReviewPanel } from "@/modules/participation/review-panel";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export const metadata = {
  title: "Reviews | Palermo Parfums",
  description: "Customer reviews for a Palermo perfume.",
};

/**
 * Temporary host for ReviewPanel (#278) until #249 ships the real perfume
 * detail page. ReviewPanel takes perfumeId/perfumeName as props and is meant
 * to be mounted at the bottom of that page -- see
 * src/modules/participation/review-panel.tsx. This route exists only so the
 * component is reachable for review/QA/screenshots; it should be removed once
 * the real product page mounts ReviewPanel directly.
 */
export default async function ReviewsDemoPage() {
  let session: Session | null = null;
  let cart: CartDto | null = null;

  const [sessionResult, cartResult] = await Promise.all([
    api.auth.getSession().catch(() => ({ ok: false as const })),
    api.cart.get().catch(() => ({ ok: false as const })),
  ]);

  if (sessionResult.ok) session = sessionResult.data;
  if (cartResult.ok) cart = cartResult.data;

  return (
    <CustomerShell cart={cart} session={session}>
      <div className="mx-auto max-w-4xl py-2">
        <ReviewPanel perfumeId="p1" perfumeName="Sicilian Bergamot & Neroli" />
      </div>
    </CustomerShell>
  );
}
