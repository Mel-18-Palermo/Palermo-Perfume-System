import { CustomerShell } from "@/components/layout/customer-shell";
import { CartView } from "@/modules/commerce/cart-view";

export const metadata = {
  title: "Shopping Bag | Palermo Parfums",
  description: "Review and manage your selected luxury fragrances and customisations.",
};

export default function CartPage() {
  return (
    <CustomerShell cartCount={3}>
      <CartView />
    </CustomerShell>
  );
}