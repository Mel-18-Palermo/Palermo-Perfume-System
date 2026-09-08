# Palermo client contract (#241)

`src/contracts/api.ts` is the complete `PalermoApi` interface. Components use its `api.*` operations; implementation adapters and UI share these types. DTOs are JSON-compatible, read-only values, not Prisma entities. IDs/revisions are opaque strings and timestamps are ISO 8601 UTC strings.

## Use an adapter

The default client in `src/lib/api/index.ts` uses the real server HTTP adapter for `auth`. Other modules return `TEMPORARILY_UNAVAILABLE` until their server adapters are supplied. It never silently falls back to synthetic success. The mock module is a separate import and is not imported by the default client.

```ts
import { createApiClient } from "@/lib/api";
import { createMockApi } from "@/lib/api/mocks";

// Explicit development/test composition. Create once per UI demo or test.
const api = createApiClient(createMockApi({ actor: "CUSTOMER" }));
const result = await api.catalogue.list({ family: ["family-citrus"], page: 1 });
if (result.ok) {
  // Render result.data.items, page, pageSize and hasMore.
} else {
  // Render result.error.message; branch on result.error.code where needed.
}
```

Replace the injected adapter with an implementation of `PalermoApi` when real endpoints become available. Do not create an adapter on every render, put a mutable mock singleton in a server request handler, or select mocks automatically after a network/server error. No environment variables are needed here.

The real adapter currently has placeholders only. Real transport implementations must validate `unknown` responses, map failures to the stable application error codes, and keep credentials/provider internals out of DTOs. A TypeScript type is not runtime validation. `isMoneyValue` demonstrates the explicit minor-unit invariant; it is not a validator for an entire response or an ISO currency registry.

## Contract inventory

| Contract | Operations / values | Requirement decisions |
|---|---|---|
| `common.ts` | Result/errors, opaque IDs/revisions, timestamps, pagination, money | D-082, D-085, D-095 |
| `auth.ts` | Session, register/verify/login/logout, password reset | D-001–D-003, D-057–D-058 |
| `catalogue.ts` | List/detail, controlled filter choices, variants, fragrance data and customisation eligibility | D-010, D-013–D-028 |
| `profile.ts` | Profile/preferences, current delivery/billing addresses, identity, deactivation | D-002–D-007 |
| `recommendations.ts` | Versioned structured quiz, answers, recommendation results/fallback | D-031–D-033 |
| `cart.ts`, `wishlist.ts` | Visitor/customer cart, customisations, quantity/promotion mutations, account wishlist | D-011, D-027–D-028, D-034–D-037 |
| `checkout.ts` | Delivery choices, checkout request and discriminated outcomes | D-036–D-040, D-043, D-045 |
| `orders.ts`, `tracking.ts` | Separate order/payment/shipment states, snapshots, invoice, cancellation request, simulator tracking | D-038–D-047 |
| `admin.ts` | Period-based dashboard, catalogue/variants, inventory, finished batches | D-012–D-014, D-057–D-061, D-067–D-072 |

This issue selects presentation status names in those contracts; database enums remain the persistence issue's responsibility. Vocabulary values such as family, intensity and suitability are controlled IDs/labels returned by catalogue metadata. The fixture vocabulary is synthetic and does not freeze the production taxonomy.

## Transport and mutation rules

- Every operation returns `Promise<ApiResult<T>>`, with `{ ok: true, data }` or `{ ok: false, error }`. Errors distinguish validation, unauthenticated, forbidden, not found, conflict, unavailable, integration failure and internal failure. Field errors use input field names. No raw exceptions, provider payloads or stacks belong in `error.message`.
- Prices use `{ amountMinor, currency }`: a non-negative safe integer in the currency's minor unit and an uppercase three-letter currency code. Fixture `12000 AUD` represents AUD 120.00. AUD is fixture data, not a new production currency/tax decision. UI formats prices; server remains authoritative for totals.
- Catalogue `minPrice`/`maxPrice` are inclusive minor-unit bounds on an available variant. Filter arrays OR within a category and AND across categories. Search matches structured catalogue text. Pagination defaults to page 1 / size 20, maximum size 100; no total-count guarantee, brand filter or arbitrary sort.
- Profile/cart/admin updates supply an `expectedRevision` (checkout uses `expectedCartRevision`). After success use the returned revision; variant writes use the parent catalogue revision and require reloading `getPerfume` before another edit. After `CONFLICT`, reload and confirm the latest state. A stale retry must not be blindly replayed as a new mutation.
- Checkout and critical create/release/cancellation operations carry an `idempotencyKey`. Keep the key for retries of the same request and use a new key when its content changes. Persistent replay/transaction guarantees belong to the real backend, not these in-memory mocks.
- Wishlist add/remove are idempotent set operations. Profile/address updates replace the specified editable fields. Billing reuse is explicit through `USE_DELIVERY`. Cancellation records a request; it does not cancel an order or promise a refund.
- `READY_FOR_PAYMENT` returns an opaque Palermo payment attempt, order ID and expiry. It does not mean paid. Exact Stripe client-safe transport is deliberately left to #262; this issue exposes no credentials, fake Stripe client secret or invented provider URL.

## Mock scenarios and limits

Each `createMockApi()` call has isolated state and a fixed synthetic clock (`2026-09-01T00:00:00.000Z`). It clones inputs/results so consumer mutations cannot corrupt another call's data. Expiry timestamps are relative to that fixture clock, not live payment links.

```ts
createMockApi(); // Visitor; public discovery/cart, protected operations unauthenticated.
createMockApi({ actor: "CUSTOMER", empty: true });
createMockApi({ actor: "ADMIN", errors: { "admin.archivePerfume": "CONFLICT" } });
createMockApi({ errors: { "recommendations.generate": "INTEGRATION_ERROR" } });
createMockApi({ actor: "CUSTOMER", checkoutStatus: "OUT_OF_STOCK" });
```

`errors` keys are type-checked operation names and inject a persistent safe error for that operation only. Access checks run before injected scenarios. All five checkout outcomes are available. Empty scenarios clear collection views, not metadata needed to render forms.

Session login/logout, profile/address changes, cart quantities/items and wishlist sets support per-instance UI interaction. Login uses the harness-selected persona; credentials/tokens are not authenticated, stored or logged. Registration returns a pending-verification receipt; it does not provision an account. Deactivation prevents that instance's customer from signing in again. These are presentation fixtures, not authentication tests.

Admin catalogue writes and batch creation return canned fixtures rather than maintaining a complete catalogue. Batch release supports a once-only fixture stock change. Profile identity and recommendation results are fixed, explicitly synthetic output, not scoring or AI implementations. Promotion application has an invalid-code fixture and supports clearing a code; no production discount rules are invented. Checkout creates only a pending-order fixture; it does not calculate a live quote, reserve stock, call Stripe or finalise payment. Fixed order/invoice/checkout fixtures are for rendering outcomes, not validating a changed cart's real order snapshots.

Server auth/RBAC, ownership enforcement, validation, account verification, real persistence, durable idempotency, pricing, stock concurrency and provider behavior must be independently implemented and tested in their owning issues. Mock access checks cannot secure a browser or API endpoint.

## Existing UI branches

UI integration remains in the corresponding UI issues. Remove their local DTO/fixture copies and import the canonical types; do not add compatibility DTOs here. Specific changes include `category` → `primaryFamily.id/label`, floating prices → `MoneyValue`, address `city/region/postalCode` → `suburb/state/postcode`, and nullable customisation fields. A Visitor cart is never checkout-eligible. Invoice availability and order success must follow Palermo's payment state.

## Verification

`pnpm typecheck`, `pnpm lint`, and `pnpm test` cover strict adapter parity, money boundary validation, safe error fixtures, query/pagination semantics, unauthenticated/forbidden states, stale revisions, clone isolation, cart/wishlist mutations, checkout outcomes and pending-payment invoice rejection. These are contract/mock tests, not proof of implemented backend business rules.
