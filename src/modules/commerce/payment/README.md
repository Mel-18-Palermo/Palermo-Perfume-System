# Payment boundary

When `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are configured, the server
creates one Stripe test-mode PaymentIntent per Palermo payment attempt using a
stable idempotency key. The browser receives only the PaymentIntent id and
client secret through `api.payment.initiate`; `getStripeClient()` is the
browser-safe Stripe.js loader, and card data remains inside Stripe Elements.

The webhook route verifies the raw request body with Stripe's official
`constructEvent` implementation and handles `payment_intent.succeeded` and
`payment_intent.payment_failed`. Palermo keeps the authoritative transaction:
successful events confirm the order, commit reservations and append inventory
movements atomically. Duplicate successful events are idempotent.

If Stripe credentials are absent, the explicit `SandboxPaymentGateway` remains
available for deterministic tests. It uses the legacy HMAC fixture format only;
it is not presented as a Stripe integration.
