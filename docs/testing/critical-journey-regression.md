# Critical Journey Regression Map

This map records the repeatable automated coverage for issue #283. The database
suite applies migrations to the explicitly configured disposable
`palermo_test` schema and uses deterministic providers/fixtures; unit tests use
mocked transports. Neither suite calls live Stripe, Supabase, OpenAI, or other
mutable production services.

| Journey | Existing regression | Added regression | Status | Known exclusion |
| --- | --- | --- | --- | --- |
| Register / verify / login | `tests/integration/identity-cases.ts` | — | Covered | Browser UX is not exercised. |
| Catalogue / filter / detail | `tests/integration/catalogue-cases.ts` | `tests/e2e/customer-critical-journey.spec.ts` | Covered | — |
| Cart | `tests/integration/cart-cases.ts` | `tests/e2e/customer-critical-journey.spec.ts` | Covered | — |
| Checkout | `tests/integration/checkout-cases.ts` | `tests/e2e/customer-critical-journey.spec.ts` | Covered | Browser stops at the pre-payment boundary. |
| Payment success | `tests/integration/payment-cases.ts`, `tests/unit/payment-stripe.test.ts` | — | Covered | No live Stripe interaction. |
| Payment failure | `tests/integration/payment-cases.ts`, `tests/unit/payment-stripe.test.ts` | — | Covered | No live Stripe interaction. |
| Order / tracking | `tests/integration/order-cases.ts`, `tests/integration/delivery-cases.ts`, `tests/unit/tracking-client.test.ts` | `tests/e2e/customer-critical-journey.spec.ts` | Covered | — |
| Admin protected access | `tests/integration/identity-cases.ts`, `tests/unit/admin-auth-ui.test.ts` | `tests/e2e/admin-critical-journey.spec.ts` | Covered | — |
| Catalogue / inventory admin smoke | `tests/integration/admin-catalogue-cases.ts`, `tests/integration/inventory-cases.ts` | `tests/e2e/admin-critical-journey.spec.ts` | Covered | — |
| AI failure isolation | `tests/unit/ai-recommendation.test.ts`, `tests/unit/openai-recommendation-provider.test.ts` | `tests/unit/critical-route-boundaries.test.ts` | Covered | No live AI provider interaction. |

## Browser E2E / preview status

`pnpm test:e2e` resets the explicitly configured local `palermo_test` schema,
applies normal Prisma migrations, seeds only `tests/e2e/seed.ts`'s fixed
browser fixture, builds Next once, and runs the separate customer and admin
Playwright Chromium processes against that local production server. It rejects non-local database hosts. Set `TEST_DATABASE_URL`,
`DATABASE_URL`, and `DIRECT_URL` to the same disposable local PostgreSQL URL
before running it; the schema must be owned by that local test role. The E2E identity provider is enabled only by the runner's
explicit `PALERMO_E2E_AUTH=1` plus `PALERMO_DATABASE_ENV=development`. The
production server also supplies the test-only
`PALERMO_E2E_PRODUCTION_SERVER=1` flag; production mode without that flag
still throws.

CI provisions the same disposable PostgreSQL service and runs this suite as a
required Browser E2E job. It installs Chromium only. Stripe is not invoked:
the browser stops after a deterministic order reaches `READY_FOR_PAYMENT`.
The E2E fixture has no hosted Supabase or AI dependency.

Vercel Preview itself is not exercised. This suite verifies the isolated CI
application only; preview-specific deployment configuration, CDN behaviour,
and externally configured Preview services remain outside this regression.
