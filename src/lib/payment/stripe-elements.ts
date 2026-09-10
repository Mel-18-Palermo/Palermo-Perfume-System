import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | undefined;
/** Browser-safe Stripe.js loader. Card fields must be rendered by Stripe Elements. */
export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"];
    stripePromise = publishableKey?.startsWith("pk_test_") ? loadStripe(publishableKey) : Promise.resolve(null);
  }
  return stripePromise;
}
