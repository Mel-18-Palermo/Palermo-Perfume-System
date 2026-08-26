# Palermo Perfume System — Frontend Contract Rules

Status: **Contract baseline for parallel implementation**

This document defines how customer/admin UI communicates with Palermo server/domain logic. The exact code is created by scaffold/contract issues; these rules are frozen.

## 1. Single contract source

```text
src/contracts/
├── auth.ts
├── common.ts
├── catalogue.ts
├── profile.ts
├── recommendations.ts
├── cart.ts
├── checkout.ts
├── orders.ts
├── tracking.ts
└── admin.ts
```

No duplicate DTO definitions in feature folders.

## 2. Single API client

Frontend uses:
```ts
api.auth.*
api.catalogue.*
api.profile.*
api.recommendations.*
api.cart.*
api.checkout.*
api.orders.*
api.tracking.*
api.admin.*
```

No scattered raw `fetch()` in components.

UI never directly calls Prisma, Supabase database APIs, Stripe, AI or email providers.

## 3. Mock/real parity

```text
UI
↓
Palermo client contract
↓
mock adapter OR real server adapter
```

Mocks use exact canonical DTOs. No mock-only fields or impossible states.

## 4. Application errors

UI must distinguish stable application-level semantics:
```ts
type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TEMPORARILY_UNAVAILABLE"
  | "INTEGRATION_ERROR"
  | "INTERNAL_ERROR";
```

Exact transport may be refined by backend owner.

Never expose raw stack traces, provider payloads or DB errors.

## 5. IDs and money

IDs are opaque strings. UI does not parse meaning from them or create authoritative server IDs.

Money representation is backend-owned and unambiguous. UI may format it, but does not use floating-point client arithmetic for authoritative checkout totals.

## 6. Auth contracts

Conceptual session:
```ts
type SessionUser = {
  id: string;
  role: "CUSTOMER" | "ADMIN";
  email: string;
  displayName: string;
};
```

Never infer admin from route/email/local storage.

Auth operations conceptually:
```text
register
verify
login
logout
getSession
requestPasswordReset
completePasswordReset
```

Semantics:
- registration starts pending verification;
- verified + active required for normal login;
- deactivation invalidates sessions;
- no invented reactivation.

## 7. Catalogue contracts

Separate list/detail shapes.

Conceptual:
```ts
type PerfumeSummary = {
  id: string;
  slug: string;
  name: string;
  primaryFamily: string;
  imageUrl: string | null;
  priceFrom: MoneyValue;
  intensity: string | null;
};

type PerfumeDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  primaryFamily: string;
  notes: FragranceNoteSummary[];
  variants: PerfumeVariantSummary[];
  suitability: SuitabilitySummary;
  images: PerfumeImageSummary[];
};
```

Exact fields must remain requirement-backed.

Approved filters only:
- note;
- family;
- price range;
- intensity;
- occasion;
- mood;
- weather.

No brand filter.

## 8. Catalogue query

Conceptual:
```ts
type CatalogueQuery = {
  q?: string;
  note?: string[];
  family?: string[];
  minPrice?: number;
  maxPrice?: number;
  intensity?: string[];
  occasion?: string[];
  mood?: string[];
  weather?: string[];
  page?: number;
};
```

Do not add filters/sorts independently.

Pagination must explicitly define current page/cursor, page size where applicable and whether more results exist. Do not assume totals unless promised.

## 9. Profile/preferences

May represent:
- supported profile fields;
- current delivery address;
- current billing address;
- fragrance preferences;
- favourite notes;
- preferred intensity;
- optional sensitivity;
- fragrance identity where available.

Sensitivity UI must not make medical claims.

## 10. Recommendation contracts

Milestone flow:
```text
quiz definition
→ answers
→ server validation
→ approved context
→ AI adapter
→ recommendation
```

Conceptual:
```ts
type RecommendationItem = {
  perfumeId: string;
  perfume: PerfumeSummary;
  reason: string;
};

type RecommendationResult = {
  runId: string;
  items: RecommendationItem[];
  generatedAt: string;
  fallback: boolean;
};
```

AI is advisory. Failure must not block catalogue/cart.

## 11. Cart contracts

Conceptual:
```ts
type CartDto = {
  id: string;
  kind: "VISITOR" | "CUSTOMER";
  items: CartItemDto[];
  pricing: CartPricingDto;
  checkoutEligible: boolean;
  validationMessages: CartValidationMessage[];
};
```

Item identifies variant, quantity, approved customisations, current display price and validation state.

UI never treats locally calculated price as checkout authority.

## 12. Wishlist

Account-specific list/add/remove only. No anonymous persistent wishlist unless scope changes.

## 13. Checkout

Authenticated Customer only. No guest checkout.

Conceptual:
```ts
type CheckoutRequest = {
  cartId: string;
  deliveryAddressId: string;
  billingAddressId: string;
  deliveryMethodId: string;
  promotionCode?: string;
  idempotencyKey: string;
};
```

Server revalidates:
- auth;
- cart;
- variant/quantity;
- price;
- promotion;
- inventory;
- address/method eligibility.

Possible semantic results:
```text
READY_FOR_PAYMENT
REQUIRES_CART_REVIEW
OUT_OF_STOCK
INVALID_PROMOTION
CHECKOUT_CONFLICT
```

Exact state names backend-owned.

UI never shows order success until Palermo verifies payment/finalisation.

## 14. Payment boundary

Frontend may receive only Stripe client-safe data required by approved sandbox flow.

Never expose/store/log:
- Stripe secret key;
- raw PAN/CVV;
- privileged provider credentials.

Browser provider success is not authoritative finalisation.

## 15. Orders

Conceptual:
```ts
type OrderSummary = {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  total: MoneyValue;
};
```

UI never invents paid/cancelled/shipped/delivered/refunded transitions.

## 16. Tracking

Baseline one shipment per order.

Conceptual:
```ts
type ShipmentTrackingDto = {
  shipmentId: string;
  orderId: string;
  status: ShipmentStatus;
  events: TrackingEventDto[];
  updatedAt: string;
};
```

Consume simulator-generated server state. No invented courier provider.

## 17. Admin

Contracts may expose:
- dashboard aggregates;
- catalogue list/detail;
- perfume/variant mutations;
- inventory/batch views;
- promotions;
- review moderation;
- selected reporting.

Every admin mutation requires server-side authorisation independent of UI.

## 18. Mutation requirements

Each mutation contract defines:
- input;
- success;
- validation failure;
- authorisation failure;
- conflict/stale state;
- retry/idempotency expectations where relevant.

Critical mutations: registration, profile/address, cart, checkout, payment finalisation, admin catalogue, inventory, moderation.

## 19. Loading/retry

Assume requests can be slow, fail, conflict or be retried.

Prevent accidental duplicate mutations.

Long-running AI/provider work requires pending and recovery states.

## 20. Contract change process

1. Do not directly edit `src/contracts/**` unless issue permits.
2. Identify missing field/operation.
3. Cite requirement/use case.
4. Explain why existing contract is insufficient.
5. Get backend-owner approval.
6. Update fixture and real implementation together.

No contract change silently adds business scope.

## 21. Contract DoD

Ready only when:
- names/states stable for milestone;
- mock fixture exists;
- invalid/empty/error examples available where useful;
- no secret/provider-private data exposed;
- fields requirement-backed;
- client/server share definition;
- technical owner reviewed.
