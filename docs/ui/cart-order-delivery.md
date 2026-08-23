# Cart, Order, Payment and Delivery — UI Requirements

## Purpose

Define the minimum UI surfaces needed for issue #165 while preserving the approved cart, payment, order, and delivery boundaries.

## Actor access

| Surface | Visitor | Customer |
|---|---:|---:|
| Temporary cart | Yes | Yes |
| Cart totals / promo code | Yes | Yes |
| Wishlist | No | Yes |
| Checkout / order placement | No | Yes |
| Payment | No | Yes |
| Invoice | No | Yes, own order |
| Order history/detail | No | Yes, own order |
| Cancellation request | No | Yes, own eligible order |
| Shipment tracking | No | Yes, own order |

Guest checkout is not part of the baseline.

## `UI-COM-001` — Cart

**Supports:** `UC-CART-001`–`UC-CART-004`

Required elements:
- cart lines with perfume/variant identification;
- quantity control and remove action;
- current server-calculated unit/line pricing;
- any approved item customisations;
- current availability state;
- promotional-code entry and result;
- subtotal, discount, and current payable cart total;
- checkout action.

Required states:
- empty cart;
- normal cart;
- item unavailable;
- price changed since earlier view;
- invalid/ineligible promotional code;
- total calculation unavailable/error.

Rules:
- adding to cart does not imply stock reservation;
- browser/client totals are never presented as authoritative;
- an unavailable line must be clearly identified before checkout;
- tax/GST handling is not invented here;
- Visitor checkout action must lead to authentication rather than guest checkout.

## `UI-COM-002` — Wishlist

**Supports:** `UC-CART-005`

Required elements:
- saved perfume list;
- current availability indication;
- remove action;
- action to open the perfume;
- action to proceed toward cart only when a sellable variant can be selected.

Required states:
- empty wishlist;
- normal;
- saved perfume archived/unavailable;
- error.

Rules:
- wishlist is account-specific;
- Visitor must authenticate before wishlist management;
- wishlist does not reserve stock.

## `UI-COM-003` — Checkout

**Supports:** `UC-ORDER-001`, `UC-DELIVERY-001`

Required elements:
- authenticated Customer identity context;
- validated cart summary;
- delivery-address and billing-address summary from approved profile data;
- active delivery-method choices with displayed charge/information;
- promotional-code result;
- order subtotal, discount, delivery charge, and validated total;
- clear Place Order / Continue to Payment action.

Required states:
- authentication required;
- normal checkout;
- item availability changed;
- price changed;
- promotional code invalidated;
- selected delivery method unavailable;
- stock no longer sufficient;
- order placement error.

Rules:
- checkout must revalidate price, availability, promotion, and delivery information;
- Customer must be able to review changed information before continuing;
- no guest checkout;
- exact carrier names/fees are configured data, not hard-coded by this SRS;
- no refund or tax workflow is introduced.

## `UI-COM-004` — Payment

**Supports:** `UC-PAY-001`

Required elements:
- clear order reference/summary;
- provider-controlled Stripe sandbox/payment interface or transition to it;
- payment progress state;
- payment success result;
- payment failure result with a safe retry path where the order remains eligible.

Required states:
- ready for provider;
- processing/pending;
- success;
- failure;
- expired/abandoned attempt;
- provider unavailable.

Rules:
- Palermo UI must not implement its own raw card-number or CVV/CVC storage;
- sensitive payment credentials are handled by the Stripe sandbox/payment service;
- repeated clicks/retries must not visually imply or create duplicate orders/payments;
- provider/internal errors must be presented without exposing secrets or internal implementation detail.

## `UI-COM-005` — Order confirmation and invoice

**Supports:** `UC-ORDER-002`

Required elements:
- order identifier;
- immutable order summary;
- payment result;
- delivery summary;
- digital-invoice action only after successful payment.

Required states:
- payment successful / invoice available;
- invoice temporarily unavailable after successful payment;
- payment not successful / invoice unavailable;
- error.

Rules:
- invoice must not be shown as issued before successful server-verified payment;
- invoice content uses the immutable order/billing/pricing/payment-reference snapshots;
- no unsupported GST/tax representation is invented.

## `UI-COM-006` — Order history and order detail

**Supports:** `UC-ORDER-003`, `UC-ORDER-004`, `UC-DELIVERY-002`, `UC-DELIVERY-003`

Required elements:
- Customer's own order list;
- order detail with immutable item/total/address/delivery summary;
- current payment-status information;
- current fulfilment/delivery-status information;
- invoice link where eligible;
- cancellation-request action where currently eligible;
- tracking action where tracking exists.

Required states:
- no orders;
- normal order list/detail;
- cancellation eligible;
- cancellation already requested / no longer eligible;
- tracking not yet available;
- tracking available;
- delivered;
- error.

Rules:
- only own orders are displayed;
- order/payment/delivery concepts remain separate;
- UI must not invent new order states beyond the centrally approved lifecycle;
- shipped or delivered orders do not offer the baseline cancellation request;
- cancellation UI must not promise a refund or other financial remedy.

## `UI-COM-007` — Shipment tracking

**Supports:** `UC-DELIVERY-002`, `UC-DELIVERY-003`

Required elements:
- Palermo tracking reference;
- current controlled shipment status;
- available status/history information produced by the internal simulator;
- delivered confirmation source/time when recorded;
- link back to the order detail.

Required states:
- tracking not yet available;
- active tracking;
- delivered confirmation;
- tracking unavailable/error.

Rules:
- the baseline must not display or imply a real courier integration;
- one shipment is shown for each baseline order;
- split shipments and partial fulfilment are not represented;
- delivery confirmation is generated through the internal simulator workflow, not manual database editing.

## UI traceability

| UI surface | Use cases | Requirement coverage |
|---|---|---|
| `UI-COM-001` Cart | `UC-CART-001`–`UC-CART-004` | `FR-CART-001`–`FR-CART-004` |
| `UI-COM-002` Wishlist | `UC-CART-005` | `FR-CART-005` |
| `UI-COM-003` Checkout | `UC-ORDER-001`, `UC-DELIVERY-001` | `FR-ORDER-001`, `FR-DELIVERY-001` |
| `UI-COM-004` Payment | `UC-PAY-001` | `FR-ORDER-002` |
| `UI-COM-005` Confirmation / invoice | `UC-ORDER-002` | `FR-ORDER-003` |
| `UI-COM-006` Order history/detail | `UC-ORDER-003`, `UC-ORDER-004`, `UC-DELIVERY-002`, `UC-DELIVERY-003` | `FR-ORDER-004`, `FR-DELIVERY-002`, `FR-DELIVERY-003` |
| `UI-COM-007` Tracking | `UC-DELIVERY-002`, `UC-DELIVERY-003` | `FR-DELIVERY-002`, `FR-DELIVERY-003` |

## Boundaries

This UI specification does not define database schema, API contracts, raw payment handling, refunds, returns, exchanges, real carrier integration, split shipments, multiple warehouses, additional payment methods, tax/GST rules, or application code.
