# Functional requirements FR46–FR90

Related issue: #144

## Status and wording

This is the proposed Part 2 baseline derived from the current issue scope. Each statement describes
observable behaviour and needs stakeholder review before it is marked approved. `Must` identifies
the minimum assessed system; `Should` identifies behaviour that may be deferred only through a
recorded scope decision.

The roles `customer` and `administrator` use the permissions in the RBAC specification. Prices,
promotions, shipping choices, payment providers, and AI models remain configuration or stakeholder
decisions.

## Customer profile and scent identity

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR46 | Must | The system shall allow an authenticated customer to view their own customer profile. | The profile page shows the signed-in customer's saved fields and rejects another customer's ID. |
| FR47 | Must | The system shall allow a customer to update the editable contact and preference fields in their own profile. | Valid changes persist and appear after a new request. |
| FR48 | Must | The system shall validate profile changes on the server before saving them. | Missing, malformed, over-length, and unexpected values are rejected without a partial update. |
| FR49 | Must | The system shall present the approved fragrance-identity quiz and its available answers. | Every approved question is displayed in the defined order with required answers identified. |
| FR50 | Must | The system shall allow a customer to submit and save a complete set of quiz answers. | A valid submission is linked only to the authenticated customer. |
| FR51 | Must | The system shall calculate a fragrance identity from the approved quiz-scoring rules. | Fixed answer fixtures produce the expected identity in repeatable tests. |
| FR52 | Must | The system shall show the customer their calculated fragrance identity and matched scent traits. | The result displays the stored identity and its approved explanation. |
| FR53 | Must | The system shall allow a customer to retake the quiz and replace their current scent profile. | The new result becomes current while another customer's profile is unchanged. |
| FR54 | Must | The system shall allow a customer to clear their saved quiz answers and fragrance identity. | The cleared profile no longer appears in the customer view or recommendation input. |

## Discovery and recommendations

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR55 | Must | The system shall allow visitors and customers to browse active products by category and collection. | Inactive products are absent and each selected group returns its active products. |
| FR56 | Must | The system shall search active products using an entered product or fragrance term. | Matching names or approved searchable descriptions are returned; unrelated items are not. |
| FR57 | Must | The system shall filter active products by one or more selected fragrance notes. | Results satisfy the documented match rule for every selected note. |
| FR58 | Should | The system shall allow a user to choose a scent family through the interactive fragrance wheel. | Selecting a family applies the corresponding catalogue filter and can be cleared. |
| FR59 | Must | The system shall show an active product's description, price, availability, category, collection, and scent-note breakdown. | A product detail request displays current stored values and returns not found for an inactive item. |
| FR60 | Must | The system shall recommend active products that match the customer's current fragrance identity. | Approved profile fixtures return the expected ranked product set. |
| FR61 | Should | The system shall show the matched scent traits used to explain each recommendation. | Each recommended product includes only explanations supported by its notes and the customer's profile. |
| FR62 | Should | The system shall paginate and sort catalogue results using approved options. | Page boundaries contain no duplicates and invalid sort values are rejected. |

## Cart and checkout

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR63 | Must | The system shall allow an authenticated customer to add an active, in-stock product to their own cart. | A valid product and quantity appear once in that customer's cart with the quantity combined. |
| FR64 | Must | The system shall allow a customer to change the quantity of an item in their own cart. | Valid quantities persist; zero, negative, excessive, and non-numeric quantities follow the approved validation rule. |
| FR65 | Must | The system shall allow a customer to remove an item from their own cart. | The selected item is removed without changing another item or customer's cart. |
| FR66 | Must | The system shall calculate line totals, discount, shipping, and order total on the server. | Totals are reproduced from stored prices and approved rules without trusting browser-supplied amounts. |
| FR67 | Must | The system shall validate an entered promotion code against its configured status, conditions, and validity period. | Eligible codes apply once; invalid, expired, or ineligible codes do not change the total. |
| FR68 | Must | The system shall show whether a promotion was accepted and the resulting discount. | The checkout summary identifies the accepted code or a clear rejection reason without exposing internal data. |
| FR69 | Must | The system shall present the currently available shipping choices and their configured prices. | Only active choices are selectable and the selected price is included in the server-calculated total. |
| FR70 | Must | The system shall show a final checkout summary before the customer confirms the order. | The summary contains items, quantities, discounts, shipping, delivery details, and total from server-side data. |

## Orders, payment, and invoices

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR71 | Must | The system shall require an authenticated customer and a non-empty valid cart to begin checkout. | Anonymous, empty-cart, and invalid-cart attempts cannot create an order. |
| FR72 | Must | The system shall revalidate price and stock immediately before creating an order. | A price or stock change produces an updated summary or a clear failure rather than a stale order. |
| FR73 | Must | The system shall collect and validate the delivery details required by the selected shipping method. | Missing or malformed required fields block confirmation and valid details persist with the order. |
| FR74 | Must | The system shall create one pending order and its item snapshot as a single transactional operation. | A forced failure leaves neither a partial order nor partial items. |
| FR75 | Must | The system shall initiate payment for the server-calculated order total through the approved sandbox adapter. | The sandbox receives the order reference, amount, currency, and idempotency key without card data entering Palermo. |
| FR76 | Must | The system shall prevent a repeated checkout or provider event from producing a duplicate payment or order transition. | Replaying the same idempotency key or event ID leaves one payment attempt and one final transition. |
| FR77 | Must | The system shall update payment and order status only from a verified provider result or server-to-server status check. | A browser-supplied success value cannot mark an order paid; a verified sandbox event can. |
| FR78 | Must | The system shall show an order confirmation after the order reaches the approved confirmed state. | The confirmation contains the order reference and server-recorded summary for its owning customer. |
| FR79 | Must | The system shall generate a digital invoice from the immutable order and payment snapshot. | The invoice number is unique and its items, totals, and payment state match the stored order snapshot. |
| FR80 | Must | The system shall allow a customer to view a chronological history of their own orders and statuses. | The list contains only the authenticated customer's orders in the defined order. |
| FR81 | Must | The system shall allow a customer to view or download their own order detail and available invoice. | Ownership is checked on every request and an unavailable invoice returns a clear status. |

## Support and AI assistance

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR82 | Must | The system shall allow an authenticated customer to submit a support inquiry with an approved subject and message. | A valid inquiry receives a reference and is linked to the customer; invalid content is rejected. |
| FR83 | Must | The system shall allow a customer to view the status and conversation for their own support inquiries. | Another customer's inquiry cannot be retrieved by changing its ID. |
| FR84 | Should | The system shall allow a customer to submit an approved support question to the AI assistant. | A valid question receives a text response through the server-side adapter. |
| FR85 | Must | The system shall remove prohibited personal, payment, session, and credential fields before creating an AI request. | Adapter tests show that blocked fields never appear in the outgoing payload. |
| FR86 | Must | The system shall provide a non-AI support path when the assistant is disabled, times out, or returns an error. | The customer can still create an inquiry and no unrelated feature fails during an AI outage. |

## Administration

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR87 | Must | The system shall allow an administrator to create, update, activate, and deactivate catalogue products and their approved relationships. | Authorised changes persist, validation is enforced, and a customer receives forbidden. |
| FR88 | Must | The system shall allow an administrator to record stock adjustments with a reason. | The stock level changes atomically and the actor, change, reason, and time are auditable. |
| FR89 | Must | The system shall allow an administrator to review support inquiries and update approved inquiry or fulfilment statuses. | Only valid transitions persist and the actor and time are recorded. |
| FR90 | Should | The system shall show administrators aggregate catalogue, order, and support indicators without exposing unnecessary customer-level data. | Figures reconcile with test data, small scent-profile groups are suppressed, and non-administrators are denied. |

## Traceability and change control

Every implementation pull request must cite its requirement IDs and add or update tests for the
acceptance evidence. Changes to an ID are reviewed with the related use case, data design, UI flow,
privacy controls, and test case. Superseded requirements remain in version history; IDs are not
silently reused.

