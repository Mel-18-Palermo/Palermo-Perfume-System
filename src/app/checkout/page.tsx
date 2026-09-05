import { CustomerShell } from "@/components/layout/customer-shell";
import { CheckoutView } from "@/modules/commerce/checkout-view";

export const metadata = {
  title: "Authorised Checkout | Palermo Parfums",
  description: "Secure customer checkout and payment processing via Stripe Sandbox.",
};

export default function CheckoutPage() {
  return (
    <CustomerShell cartCount={2}>
      <CheckoutView />
    </CustomerShell>
  );
}