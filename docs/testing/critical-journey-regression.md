# Critical Journey Regression Map

This map records the repeatable automated coverage for issue #283. The database
suite applies migrations to the explicitly configured disposable
`palermo_test` schema and uses deterministic providers/fixtures; unit tests use
mocked transports. Neither suite calls live Stripe, Supabase, OpenAI, or other
mutable production services.

| Journey | Existing regression | Added regression | Status | Known exclusion |
| --- | --- | --- | --- | --- |
| Register / verify / login | `tests/integration/identity-cases.ts` | — | Covered | Browser UX is not exercised. |
| Catalogue / filter / detail | `tests/integration/catalogue-cases.ts` | — | Covered | Browser rendering is not exercised. |
| Cart | `tests/integration/cart-cases.ts` | — | Covered | Browser rendering is not exercised. |
| Checkout | `tests/integration/checkout-cases.ts` | — | Covered | Browser rendering is not exercised. |
| Payment success | `tests/integration/payment-cases.ts`, `tests/unit/payment-stripe.test.ts` | — | Covered | No live Stripe interaction. |
| Payment failure | `tests/integration/payment-cases.ts`, `tests/unit/payment-stripe.test.ts` | — | Covered | No live Stripe interaction. |
| Order / tracking | `tests/integration/order-cases.ts`, `tests/integration/delivery-cases.ts`, `tests/unit/tracking-client.test.ts` | `tests/unit/critical-route-boundaries.test.ts` | Covered | Browser rendering is not exercised. |
| Admin protected access | `tests/integration/identity-cases.ts`, `tests/unit/admin-auth-ui.test.ts` | `tests/unit/critical-route-boundaries.test.ts` | Covered | Browser sign-in UX is not exercised. |
| Catalogue / inventory admin smoke | `tests/integration/admin-catalogue-cases.ts`, `tests/integration/inventory-cases.ts` | `tests/unit/critical-route-boundaries.test.ts` | Covered | Browser rendering is not exercised. |
| AI failure isolation | `tests/unit/ai-recommendation.test.ts`, `tests/unit/openai-recommendation-provider.test.ts` | `tests/unit/critical-route-boundaries.test.ts` | Covered | No live AI provider interaction. |

## Browser E2E / preview status: incomplete

The repository has `tests/e2e/.gitkeep` only. It has no Playwright, Cypress, or
other browser-runner dependency/configuration; no `test:e2e` script; no preview
target configuration; and no CI workflow that provisions isolated services or
runs browser tests. The lockfile's optional Vitest browser peer entries are not
a configured browser test harness.

Adding a browser suite would not be repeatable with the repository as it
exists: there is no repository-local process to provision the disposable
PostgreSQL schema, seed it for a running Next server, supply a deterministic
authentication provider, or emulate the Stripe client flow without an external
mutable service. Creating those facilities would expand production/test
infrastructure beyond this issue's minimal-regression scope. Consequently, no
browser E2E or preview PASS is claimed.
