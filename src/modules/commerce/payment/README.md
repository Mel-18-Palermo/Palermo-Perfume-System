# Payment boundary

When a Stripe test-mode `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are configured, the server
creates one Stripe test-mode PaymentIntent per Palermo payment attempt using a
stable idempotency key. The browser receives only the PaymentIntent id and
client secret through `api.payment.initiate`; `getStripeClient()` is the
browser-safe Stripe.js loader, and card data remains inside Stripe Elements.

The webhook route verifies the raw request body with Stripe's official
`constructEvent` implementation and handles `payment_intent.succeeded` and
`payment_intent.payment_failed`. Palermo keeps the authoritative transaction:
successful events confirm the order, commit reservations and append inventory
movements atomically. Duplicate successful events are idempotent.

If either Stripe server credential is absent, the runtime fails closed with a
safe provider-unavailable result. `SandboxPaymentGateway` is a deterministic
test double that requires an explicit secret and explicit dependency injection;
runtime configuration never selects it automatically.

A verified success can commit only this order's complete set of active,
unexpired reservations. Each reservation claim, balance decrement, movement,
payment transition and order confirmation occurs in one transaction. A late
success returns a retryable conflict without changing commerce state. An
explicit payment retry can atomically reactivate the same released/expired
reservation rows when stock is available, allowing a repeated Stripe webhook to
finish the original payment attempt safely.
