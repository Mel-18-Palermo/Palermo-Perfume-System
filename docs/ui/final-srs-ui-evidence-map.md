# Final SRS UI Evidence Map

## Purpose

This document converts the existing Palermo UI specifications into a report-facing evidence plan for Final SRS Section 5.

It is an evidence map, not proof that the application has been implemented.

The report must distinguish:

- UI specification / storyboard / wireframe evidence created during requirements and design; from
- implemented application screenshots, which belong to later project-deliverable evidence.

## Canonical UI source files

- `docs/ui/account-profile.md`
- `docs/ui/catalogue-discovery.md`
- `docs/ui/personalisation-ai-support.md`
- `docs/ui/cart-order-delivery.md`
- `docs/ui/admin-derived-modules.md`

## Minimum report-facing UI evidence set

The Final SRS should show enough visual evidence to demonstrate the main customer and administrator journeys without reproducing every screen in the repository.

| Evidence ID | Report-facing evidence | Required content | Primary source | Coverage |
|---|---|---|---|---|
| UI-E01 | Registration / verification / login flow | registration inputs, verification state, sign-in/sign-out, password reset, account deactivation, validation/error states | `docs/ui/account-profile.md` | FR-AUTH-001..007 |
| UI-E02 | Customer profile + fragrance preferences | profile, addresses, favourite notes, intensity, non-medical sensitivity, Fragrance Identity | `docs/ui/account-profile.md` | FR-PROFILE-001..008 |
| UI-E03 | Catalogue / search / filters | browse, keyword search, note/family/price/intensity/occasion/mood filters, deterministic weather-category suggestions and perfume comparison; no invented brand filter | `docs/ui/catalogue-discovery.md` | FR-DISCOVERY-001..010 |
| UI-E04 | Perfume detail / virtual fragrance experience | fragrance wheel, top-middle-base journey, longevity/projection, suitability and virtual scent-profile comparison | `docs/ui/catalogue-discovery.md` | FR-VIRTUAL-001..007 |
| UI-E05 | Personalisation / quiz / recommendation | customisation where eligible, quiz inputs/result, AI-assisted recommendations with transparency/fallback | `docs/ui/personalisation-ai-support.md` | FR-PERSONAL-001..008 |
| UI-E06 | Cart / wishlist | Visitor temporary cart, authenticated Customer cart, wishlist, quantity, totals, promo result, customisation summary | `docs/ui/cart-order-delivery.md` | FR-CART-001..005 |
| UI-E07 | Checkout / payment / order confirmation | authenticated checkout, delivery selection, price/stock revalidation result, Stripe handoff/result, invoice/order confirmation | `docs/ui/cart-order-delivery.md` | FR-ORDER-001..004, FR-DELIVERY-001 |
| UI-E08 | Order detail / tracking | order status, invoice access, shipment/tracking, delivery confirmation, cancellation-request state where eligible | `docs/ui/cart-order-delivery.md` | FR-DELIVERY-002..003, FR-ORDER-003..004 |
| UI-E09 | AI customer support | public generic support vs authenticated own-order/delivery support, AI disclosure, feedback | `docs/ui/personalisation-ai-support.md` | FR-SUPPORT-001..008 |
| UI-E10 | Administrator dashboard / operations | dashboard/reporting, catalogue/inventory, review moderation, promotion/admin controls, RBAC-sensitive actions | `docs/ui/catalogue-discovery.md`; `docs/ui/admin-derived-modules.md` | FR-PRODUCT-001..010; FR-COLLECTION-001..008; FR-ADMIN-001..013; DER-INVENTORY-*; DER-REVIEW-001; DER-PROMO-001 |
| UI-E11 | Derived customer participation | review, loyalty, subscription opt-in/out and referral views without expanding into social-network or recurring-billing features | `docs/ui/admin-derived-modules.md` | DER-REVIEW-001; DER-COMMUNITY-001; DER-LOYALTY-001; DER-SUBSCRIPTION-001; DER-REFERRAL-001 |
| UI-E12 | Promotional content / AI video approval | content record, generate/preview, approve/reject; no automatic posting | `docs/ui/admin-derived-modules.md` | DER-SOCIAL-001..002 |

## Storyboard journeys to show or describe

The report should include concise storyboard evidence for the following end-to-end journeys.

### Storyboard A — New customer to personalised discovery

1. Register.
2. Verify email.
3. Sign in when ACTIVE.
4. Complete/edit fragrance preferences.
5. Generate/view Fragrance Identity.
6. Complete fragrance quiz.
7. View bounded recommendation results.
8. Open a perfume detail/virtual fragrance view.

### Storyboard B — Visitor discovery to authenticated purchase

1. Visitor browses/searches/filters.
2. Visitor adds an eligible variant/customisation to temporary cart.
3. Checkout requires authentication; there is no guest checkout.
4. Server revalidates product/price/promotion/stock.
5. Customer selects delivery method.
6. Stripe sandbox payment is processed/verified.
7. Order/invoice outcome is shown.
8. Shipment/tracking is shown through the internal delivery-simulator baseline.

### Storyboard C — Customer support

1. Visitor or Customer opens support.
2. Generic fragrance/product/policy questions use bounded AI assistance.
3. Own-order/delivery enquiries require authenticated ownership.
4. Palermo authoritative data is used for business facts.
5. AI failure produces a safe fallback rather than blocking commerce.
6. Customer may submit feedback.

### Storyboard D — Administrator operations

1. Administrator signs in.
2. Server-side RBAC determines available actions.
3. Administrator manages catalogue/inventory/promotion/review functions within permission.
4. Dashboard/reporting reads authoritative data.
5. High-impact/privileged actions produce audit evidence.
6. AI promotional generation requires preview and explicit approval/rejection.

## Required input-form evidence

At minimum, the Final SRS UI section should identify the important inputs and validation expectations for:

- registration;
- login/password reset;
- delivery/billing address;
- fragrance preference profile;
- fragrance quiz;
- product customisation;
- cart quantity and promotion code;
- checkout/delivery details;
- review submission;
- support feedback;
- administrator catalogue/variant editing;
- production batch/inventory actions;
- promotion creation;
- role/permission administration;
- AI promotional generation approval/rejection.

Do not add raw card-number/CVV fields to Palermo-owned forms. Payment-sensitive collection remains within the approved Stripe boundary.

## Required output/report-view evidence

At minimum, identify:

- catalogue/search results;
- perfume detail/virtual scent presentation;
- Fragrance Identity;
- recommendation results;
- cart totals/promotion result;
- order confirmation/invoice;
- tracking/delivery state;
- customer support response/fallback;
- administrator dashboard/reports;
- low-stock/inventory views;
- audit history;
- promotional-generation preview/review state.

## Responsive/accessibility evidence

The report UI discussion should state that the design is intended for:

- mobile: 375 px reference width;
- tablet: 768 px reference width;
- desktop: 1440 px reference width.

The design target is WCAG 2.2 AA and must include keyboard/focus/error-state considerations.

Do not claim these checks have passed before implementation/testing evidence exists.

## Report assembly rule

A textual UI specification is not automatically a visual figure.

For each UI-E item inserted into the report, the report editor must identify whether the evidence is:

- storyboard;
- wireframe;
- form/layout mock-up;
- design screenshot;
- or later implementation screenshot.

Do not label a specification-only artefact as a completed application screen.
