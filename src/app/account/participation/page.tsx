import { CustomerShell } from "@/components/layout/customer-shell";
import { ParticipationView } from "@/modules/participation/participation-view";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";

export const metadata = {
  title: "Rewards & Participation | Palermo Parfums",
  description:
    "Review your Palermo loyalty points, boutique subscription preference and referral rewards.",
};

export default async function AccountParticipationPage() {
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
      <ParticipationView />
    </CustomerShell>
  );
}
