import { CustomerShell } from "@/components/layout/customer-shell";
import { WishlistView } from "@/modules/participation/ui/wishlist/wishlist-view";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export default async function WishlistPage() {
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
      <WishlistView />
    </CustomerShell>
  );
}
