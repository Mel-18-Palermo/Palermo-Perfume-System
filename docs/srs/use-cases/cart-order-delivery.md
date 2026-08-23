# Cart, Order, Payment and Delivery — Use-Case Specification

## Scope

This document refines the following approved requirements without adding new business scope:

- `FR-CART-001`–`FR-CART-005`
- `FR-ORDER-001`–`FR-ORDER-004`
- `FR-DELIVERY-001`–`FR-DELIVERY-003`
- Decision `D-011`
- Decisions `D-034`–`D-047`

Canonical business actors are **Visitor** and **Customer**. The **Stripe sandbox/payment service** is an external system involved in online payment. The baseline simulated delivery provider is an **internal Palermo component**, not an external actor.

## Use-case index

| ID | Use case | Primary actor(s) | Requirement coverage |
|---|---|---|---|
| `UC-CART-001` | Add variant to cart | Visitor, Customer | `FR-CART-001` |
| `UC-CART-002` | Update cart quantity | Visitor, Customer | `FR-CART-002` |
| `UC-CART-003` | Review cart total | Visitor, Customer | `FR-CART-003` |
| `UC-CART-004` | Apply promotional code | Visitor, Customer | `FR-CART-004` |
| `UC-CART-005` | Manage wishlist | Customer | `FR-CART-005` |
| `UC-ORDER-001` | Place order | Customer | `FR-ORDER-001` |
| `UC-PAY-001` | Process online payment | Customer; Stripe sandbox/payment service | `FR-ORDER-002` |
| `UC-ORDER-002` | Access digital invoice | Customer | `FR-ORDER-003` |
| `UC-ORDER-003` | Request order cancellation | Customer | `FR-ORDER-004` |
| `UC-ORDER-004` | View own order summary and status | Customer | Supporting surface for order, cancellation, invoice, and tracking |
| `UC-DELIVERY-001` | Select delivery method | Customer | `FR-DELIVERY-001` |
| `UC-DELIVERY-002` | Track shipment | Customer | `FR-DELIVERY-002` |
| `UC-DELIVERY-003` | View delivery confirmation | Customer | `FR-DELIVERY-003` |

---

## `UC-CART-001` — Add variant to cart

**Primary actors:** Visitor, Customer  
**Goal:** Add a sellable perfume variant to the actor's cart.

**Preconditions**
- Variant exists and is available for sale.
- Actor has a temporary Visitor cart or Customer cart context.

**Trigger**
- Actor chooses Add to Cart for a sellable variant.

**Main success flow**
1. Actor selects the variant and quantity.
2. Any approved item customisations are included where the variant permits them.
3. Palermo validates the variant, quantity, customisation eligibility, current price, and current availability.
4. Palermo adds or updates the cart line.
5. Palermo recalculates the cart total.
6. Updated cart is shown to the actor.

**Alternative / exception flows**
- Invalid or unavailable variant is rejected.
- Invalid quantity is rejected without changing the cart.
- Unsupported customisation is rejected.
- Adding to cart does not reserve inventory (`D-036`).
- Repeated submission must not create an unintended duplicate business effect (`D-040`, `D-043`).

**Postconditions**
- Cart contains the validated line.
- No stock reservation has been created.

---

## `UC-CART-002` — Update cart quantity

**Primary actors:** Visitor, Customer  
**Goal:** Change the quantity of an existing cart line.

**Preconditions**
- Target cart line belongs to the actor's cart.

**Trigger**
- Actor changes a quantity or removes the line.

**Main success flow**
1. Palermo validates the requested quantity.
2. Palermo revalidates current variant availability and price.
3. Palermo updates or removes the line.
4. Palermo recalculates totals.
5. Updated cart is displayed.

**Alternative / exception flows**
- Invalid quantity leaves the previous valid cart state unchanged.
- A variant that is no longer sellable is identified and checkout cannot proceed with that line.
- Price changes are reflected using the current validated cart price; order prices are not snapshotted until order placement (`D-035`).

**Postconditions**
- Cart reflects the latest validated quantity and current price.

---

## `UC-CART-003` — Review cart total

**Primary actors:** Visitor, Customer  
**Goal:** View a server-calculated cart total.

**Preconditions**
- Actor has a cart context.

**Trigger**
- Cart is opened or a cart change completes.

**Main success flow**
1. Palermo loads the current cart lines.
2. Palermo validates current prices and availability.
3. Palermo calculates line totals and the cart subtotal.
4. Palermo applies any currently valid promotional discount.
5. Palermo returns the calculated cart total.

**Alternative / exception flows**
- Empty cart displays a zero/empty state.
- Invalid promotional code is excluded and the total is recalculated.
- Tax/GST behaviour is not defined by this work package and is not invented.
- Browser-supplied totals are never authoritative (`D-034`).

**Postconditions**
- Actor sees the current Palermo-calculated cart total.

---

## `UC-CART-004` — Apply promotional code

**Primary actors:** Visitor, Customer  
**Goal:** Apply a valid promotional code to the cart.

**Preconditions**
- Cart exists.

**Trigger**
- Actor submits a promotional code.

**Main success flow**
1. Palermo receives the code.
2. Palermo validates the code and its configured eligibility.
3. Palermo calculates the discount server-side.
4. Palermo recalculates the cart total.
5. Applied code and discount are shown.

**Alternative / exception flows**
- Invalid, inactive, expired, or ineligible code is rejected.
- The code is revalidated during order placement (`D-037`).
- Repeated submission must not duplicate the discount.

**Postconditions**
- Valid discount is reflected in the cart; final applied discount is not immutable until order placement.

---

## `UC-CART-005` — Manage wishlist

**Primary actor:** Customer  
**Goal:** Maintain an account-specific perfume wishlist.

**Preconditions**
- Customer is authenticated with an active account.

**Trigger**
- Customer saves, views, or removes a perfume from the wishlist.

**Main success flow**
1. Customer chooses to save a perfume.
2. Palermo validates the Customer and perfume.
3. Palermo records the wishlist entry for that Customer.
4. Customer may later view or remove the saved perfume.

**Alternative / exception flows**
- Visitor is required to authenticate before wishlist management.
- Archived or unavailable catalogue information is shown according to the current catalogue state and is not treated as purchasable.
- Wishlist activity does not reserve inventory.

**Postconditions**
- Customer's wishlist reflects the validated action.

---

## `UC-ORDER-001` — Place order

**Primary actor:** Customer  
**Goal:** Convert a validated cart into an order ready for payment.

**Preconditions**
- Customer is authenticated with an active account.
- Cart contains at least one valid sellable variant.
- Required checkout information is available.
- Customer has selected an active delivery method through `UC-DELIVERY-001`.

**Trigger**
- Customer confirms checkout/order placement.

**Main success flow**
1. Palermo revalidates variant availability, current prices, quantities, customisations, promotional code, and delivery method.
2. Palermo creates a short bounded inventory reservation for the checkout/payment attempt (`D-036`).
3. Palermo snapshots validated order-item prices, discount, totals, addresses, and selected delivery information.
4. Palermo creates the order and separate payment state/reference.
5. Palermo proceeds to `UC-PAY-001`.

**Alternative / exception flows**
- Visitor cannot place an order; authentication is required and guest checkout is not supported (`D-011`).
- If price, availability, promotion, or delivery information changed, Palermo shows the changed information and requires the Customer to confirm the current validated state.
- Insufficient stock prevents order placement.
- Repeated checkout submission must not create duplicate orders or reservations (`D-040`, `D-043`).

**Postconditions**
- One order exists with immutable validated snapshots and a separate payment state.
- A bounded reservation exists only for the payment window.

---

## `UC-PAY-001` — Process online payment

**Primary actor:** Customer  
**Supporting external system:** Stripe sandbox/payment service  
**Goal:** Pay for an existing Palermo order using Stripe test/sandbox processing.

**Preconditions**
- Customer owns the order.
- Order has a payment attempt/reference.
- Bounded stock reservation remains valid.

**Trigger**
- Customer proceeds to payment.

**Main success flow**
1. Palermo initiates the approved Stripe sandbox/payment flow.
2. Customer provides card credentials directly to the provider-controlled payment interface.
3. Stripe returns a payment result.
4. Palermo verifies the provider result server-side.
5. On successful payment, Palermo records successful payment state/reference.
6. Palermo commits the reserved stock exactly once.
7. Palermo confirms the order and generates the digital invoice exactly once.
8. Palermo can create the order's single shipment/tracking workflow.

**Alternative / exception flows**
- On failed payment, Palermo records failure and releases the reservation safely.
- On expired or abandoned payment, the reservation is released.
- A retry must operate without creating a duplicate order, stock commitment, payment confirmation, or invoice.
- Duplicate or out-of-order provider callbacks are handled idempotently.
- Palermo never stores raw card number, CVV/CVC, or raw payment credentials (`D-039`).

**Postconditions**
- Success: payment is recorded, stock committed once, invoice available, order may progress to fulfilment.
- Failure: no successful payment is recorded and reserved stock is released safely.

---

## `UC-ORDER-002` — Access digital invoice

**Primary actor:** Customer  
**Goal:** View the digital invoice for the Customer's successfully paid order.

**Preconditions**
- Customer owns the order.
- Payment was successfully verified.
- Invoice has been generated.

**Trigger**
- Customer opens the invoice from the order interface.

**Main success flow**
1. Palermo verifies Customer ownership.
2. Palermo retrieves the immutable invoice/order snapshots.
3. Palermo displays the invoice.

**Alternative / exception flows**
- Invoice is not available before successful payment (`D-041`).
- A Customer cannot access another Customer's invoice.
- Tax/GST rules are not invented by this work package.

**Postconditions**
- Customer can view the invoice associated with the paid order.

---

## `UC-ORDER-003` — Request order cancellation

**Primary actor:** Customer  
**Goal:** Record a cancellation request for an eligible own order.

**Preconditions**
- Customer owns the order.
- Order is eligible because shipment has not occurred.

**Trigger**
- Customer selects Request Cancellation.

**Main success flow**
1. Palermo verifies ownership.
2. Palermo checks current cancellation eligibility.
3. Customer confirms the cancellation request.
4. Palermo records the request.
5. Palermo shows the updated request/status information.

**Alternative / exception flows**
- Shipped or delivered orders are not eligible through this baseline cancellation request.
- Repeated request does not create duplicate cancellation effects.
- No refund, credit, return, exchange, or financial remedy is promised or performed by this use case (`D-042`).

**Postconditions**
- Eligible order has one recorded cancellation request.

---

## `UC-ORDER-004` — View own order summary and status

**Primary actor:** Customer  
**Goal:** Access the Customer's own order information needed for invoice, cancellation, and delivery functions.

**Preconditions**
- Customer is authenticated.

**Trigger**
- Customer opens order history or an order detail.

**Main success flow**
1. Palermo returns only orders owned by the Customer.
2. Customer selects an order.
3. Palermo shows immutable order summary information and current order/payment/delivery status information.
4. Palermo displays only actions currently allowed for that order, such as invoice access, cancellation request, or tracking.

**Alternative / exception flows**
- Another Customer's order is never disclosed.
- If no orders exist, an empty state is shown.

**Postconditions**
- Customer can navigate to the approved order-related functions.

**Note:** This is a supporting presentation use case required by the issue deliverable; it does not introduce a new business requirement or new order state.

---

## `UC-DELIVERY-001` — Select delivery method

**Primary actor:** Customer  
**Goal:** Select an active configured delivery method during checkout.

**Preconditions**
- Customer is in authenticated checkout.
- At least one active delivery method is available.

**Trigger**
- Checkout requests delivery selection.

**Main success flow**
1. Palermo displays active configured delivery methods and their displayed information/charge.
2. Customer selects one method.
3. Palermo validates the method remains active.
4. Palermo includes the method and charge in the checkout total.
5. At order placement Palermo snapshots the selected method, charge, and displayed delivery information.

**Alternative / exception flows**
- If the selected method becomes unavailable, Customer must choose another active method.
- Exact carrier names, fees, and delivery promises are not invented here.

**Postconditions**
- One validated delivery method is selected for the order.

---

## `UC-DELIVERY-002` — Track shipment

**Primary actor:** Customer  
**Goal:** View tracking information for the Customer's own order.

**Preconditions**
- Customer owns the order.
- The order has its single baseline shipment/tracking record.

**Trigger**
- Customer opens shipment tracking.

**Main success flow**
1. Palermo verifies Customer ownership.
2. Palermo retrieves the tracking reference and current controlled shipment status from the internal simulated delivery-provider workflow.
3. Palermo displays the current tracking information.

**Alternative / exception flows**
- Tracking not yet created produces a clear not-yet-available state.
- No real courier/carrier integration is represented in the baseline.
- Only one shipment exists for the baseline order; split shipment and partial fulfilment are out of scope (`D-044`).

**Postconditions**
- Customer sees current simulated tracking information for the own order.

---

## `UC-DELIVERY-003` — View delivery confirmation

**Primary actor:** Customer  
**Internal trigger source:** simulated delivery provider  
**Goal:** Show that the Customer's shipment has been confirmed delivered.

**Preconditions**
- Customer owns the order.
- Internal simulator has recorded a valid delivery confirmation.

**Trigger**
- Customer views the order/tracking information after confirmation has been recorded.

**Main success flow**
1. Internal simulated provider records the eligible shipment as delivered once, including source and time.
2. Palermo preserves that confirmation.
3. Palermo verifies Customer ownership when the order/tracking surface is opened.
4. Palermo shows the delivered status and recorded confirmation information.

**Alternative / exception flows**
- Before confirmation, Palermo continues to show the current non-delivered tracking state.
- Manual database editing is not the normal delivery-confirmation workflow.
- Duplicate confirmation must not create repeated business effects.

**Postconditions**
- Customer can see the recorded delivery confirmation for the own shipment.

---

## Requirement traceability

| Requirement | Use case |
|---|---|
| `FR-CART-001` | `UC-CART-001` |
| `FR-CART-002` | `UC-CART-002` |
| `FR-CART-003` | `UC-CART-003` |
| `FR-CART-004` | `UC-CART-004` |
| `FR-CART-005` | `UC-CART-005` |
| `FR-ORDER-001` | `UC-ORDER-001` |
| `FR-ORDER-002` | `UC-PAY-001` |
| `FR-ORDER-003` | `UC-ORDER-002` |
| `FR-ORDER-004` | `UC-ORDER-003` |
| `FR-DELIVERY-001` | `UC-DELIVERY-001` |
| `FR-DELIVERY-002` | `UC-DELIVERY-002` |
| `FR-DELIVERY-003` | `UC-DELIVERY-003` |

## Explicit boundaries

This work package does **not** define guest checkout, refunds, returns, exchanges, split shipments, multiple warehouses, real courier APIs, additional payment methods, tax/GST treatment, database schema, API routes, or backend transaction implementation. The delivery simulator remains internal to Palermo.
