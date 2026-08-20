# Palermo SRS Decision Register

> Canonical record of development-team decisions approved during SRS refinement. These decisions refine ambiguous source requirements and define bounded implementation behaviour. They do not rewrite Palermo's source numbering. Derived capabilities for source-gap modules are separately identified.

## Authentication and Profile

- `D-001` Successful email verification automatically activates an eligible `PENDING_VERIFICATION` account; no normal administrator approval step.
- `D-002` Authenticated customers may self-deactivate `ACTIVE` accounts; sessions are invalidated; deactivation is not deletion; reactivation is not currently in scope.
- `D-003` Registration requires name, email, and password only. Email is the unique login identifier; customer records use an opaque internal ID.
- `D-004` Each customer may maintain one current delivery and one current billing address; billing may reuse delivery; confirmed orders store immutable address snapshots.
- `D-005` The fragrance preference profile contains favourite notes, preferred intensity, and optional non-medical sensitivity/avoidance data; Fragrance Identity is generated output.
- `D-006` Fragrance sensitivity means optional non-medical avoidance/preference data; medical/health-condition data is not collected under this requirement.
- `D-007` Fragrance Identity uses deterministic rule-based classification, requires at least one positive preference input, and is explicitly regenerated after relevant profile changes.

## Actors and Use Cases

- `D-008` The initial business actor registry contains Visitor, Customer, and Administrator. External technical services are modelled separately where an actual system interaction exists.
- `D-009` AUTH/PROFILE requirements map to meaningful goal-oriented use cases rather than one use case per FR; account activation remains a system-triggered transition, not a separate actor use case.

## Discovery, Cart Boundary and Catalogue

- `D-010` Public catalogue discovery and virtual fragrance information are available to Visitor and Customer actors without requiring authentication.
- `D-011` Visitors may maintain a temporary cart, but an ACTIVE authenticated Customer is required before order placement; wishlist is account-specific; guest checkout is not in baseline.
- `D-012` Product, collection, note assignment, pricing, SKU, availability, and related catalogue-management functions are restricted to authorised Administrators.
- `D-013` Perfume product deletion is logical archival rather than destructive deletion; archived products are unavailable for new purchase/discovery but retained for historical integrity.
- `D-014` Bottle size, concentration, SKU, price, and sellable availability are modelled at perfume-variant level; shared descriptive/fragrance data belongs to the parent perfume.
- `D-015` Fragrance notes are reusable canonical records; TOP/MIDDLE/BASE are relationship roles between a perfume and a note.
- `D-016` Each catalogue perfume has one primary fragrance family from a controlled canonical vocabulary reused across discovery, Fragrance Identity, recommendations, and reporting.
- `D-017` Collections are reusable many-to-many groupings of perfumes with classifications such as GENERAL, SEASONAL, or LIMITED_EDITION; no separate collection entity types.
- `D-018` Catalogue search/filtering uses structured product metadata and combinable criteria; AI is not required for search/filter execution.
- `D-019` Mood and occasion filtering uses administrator-managed controlled suitability tags; the exact vocabulary is a later catalogue-design decision.
- `D-020` Weather-based suggestions deterministically map approved weather categories to perfume suitability metadata; current weather may come from an external service but AI is not required.
- `D-021` Visitors and customers may compare two to three active perfumes side-by-side using approved structured data; comparison does not generate an unsupported subjective winner.

## Virtual Fragrance Experience

- `D-022` The fragrance wheel visualises the canonical fragrance-family vocabulary and supports exploration of families and associated perfumes; it is not a separate recommendation engine.
- `D-023` Note Journey visualisation presents top, middle, and base notes as an ordered progression and does not fabricate precise evaporation/performance timings.
- `D-024` Longevity and projection use controlled catalogue classifications rather than unsupported numerical precision or dynamic prediction.
- `D-025` Day/evening and seasonal suitability are controlled multi-value perfume metadata reusable by filtering, comparison, virtual experience, and recommendation logic.
- `D-026` Virtual Scent Profile is a consolidated digital representation assembled from approved perfume catalogue/fragrance data and does not claim to reproduce physical scent or guarantee perception.

## Personalisation and AI Recommendations

- `D-027` Custom labels, engraving, gift messages, and gift packaging are stored as cart/order-item customisations and do not alter master perfume/variant records.
- `D-028` Customisation options are controlled by administrator-managed product/variant eligibility; unsupported customisations cannot be requested.
- `D-029` Perfume layering recommendations use deterministic compatibility rules over approved fragrance characteristics; AI is not required.
- `D-030` Personalised sample sets are bounded bundles of eligible sample variants using existing catalogue/cart/order structures rather than a separate commerce subsystem.
- `D-031` The fragrance discovery quiz uses approved structured questions/answers; Visitors may obtain temporary results and Customers may associate approved results with their account.
- `D-032` AI perfume recommendations operate only on approved customer/quiz context and current Palermo catalogue data; AI may rank/select/explain but is not authoritative for catalogue facts.
- `D-033` AI recommendation failure or invalid output does not prevent normal catalogue/search/checkout operation and unverifiable recommendations are not shown as valid.

## Cart, Order, Payment and Idempotency

- `D-034` Cart items reference sellable perfume variants plus selected customisations; client-submitted prices/totals are never authoritative.
- `D-035` Cart pricing is live and server-validated; order item prices, discounts, and totals are snapshotted immutably at order placement.
- `D-036` Adding to cart does not reserve stock; stock is revalidated at checkout and bounded payment reservation is released on failure/expiry.
- `D-037` Promotional-code eligibility/discount calculation is server validated and revalidated at order placement; applied discounts are snapshotted.
- `D-038` Order fulfilment state and payment state are modelled independently.
- `D-039` Online card payment uses Stripe sandbox/test integration; Palermo stores payment references/status only, never raw card numbers or CVV/CVC; provider result is server verified.
- `D-040` Repeated checkout/payment/provider callbacks must not create duplicate orders, stock deductions, invoices, or confirmed payments.
- `D-041` Digital invoice generation occurs only after successful payment and uses immutable order/billing/pricing/payment-reference snapshots.
- `D-042` Cancellation is a recorded request for an eligible pre-shipment order, not destructive deletion; refund behaviour is not invented without approved business rules.
- `D-043` Transactional mutations whose repetition could create duplicate business effects are idempotent through persistent transaction identity, database integrity constraints, and atomic processing rather than process-local checks alone.

## Delivery and Tracking

- `D-044` Each baseline order uses one shipment/fulfilment record; split shipments and partial fulfilment are not included.
- `D-045` Customers select an active configured delivery method; delivery method, charge, and displayed delivery information are snapshotted onto the order.
- `D-046` Baseline shipment tracking uses an internal simulated delivery provider that generates demo tracking references and controlled status updates behind a replaceable provider abstraction.
- `D-047` Baseline delivery confirmation comes from the simulated delivery provider, transitions eligible shipments to DELIVERED, and preserves confirmation source/time; manual DB edits are not the normal workflow.

## Customer Support and AI Assistant

- `D-048` Customer Support and AI Assistance are implemented as one bounded conversational assistant rather than independent chatbot subsystems.
- `D-049` Generic fragrance/product/policy assistance may be public; customer-specific order/payment/delivery/account information requires authentication and ownership checks.
- `D-050` Palermo application data and approved policy content remain authoritative; AI interprets/presents information but does not invent business facts.
- `D-051` AI accesses Palermo only through explicitly approved server-side tools/services that independently enforce authentication, authorisation, validation, and data minimisation.
- `D-052` Intent identification uses an approved bounded set of operational support intents and does not infer unrelated sensitive, demographic, or psychological traits.
- `D-053` The AI may retrieve/explain approved return policy but cannot approve returns, refunds, exchanges, or financial remedies without a separately approved workflow.
- `D-054` Official feedback records are created only after explicit customer submission/confirmation and store only approved data needed for follow-up/reporting.
- `D-055` AI support failure, timeout, safety rejection, or invalid output does not affect core commerce functionality and does not trigger fabricated fallback information.
- `D-056` Support conversation retention is limited to approved support/audit/feedback/AI-performance purposes; exact retention/access/deletion rules are defined in the DPIA.

## Admin, RBAC, Audit and Backup

- `D-057` All administrative functionality requires authenticated administrative identity plus server-side authorisation; customer authentication alone never grants admin access.
- `D-058` Administrative authorisation uses server-enforced role-based permissions, deny-by-default behaviour, and least privilege; organisational staff role names are not invented without justification.
- `D-059` Administrative account creation/deactivation/role assignment requires the appropriate permission and audit logging; admins cannot silently escalate or bypass authorisation.
- `D-060` Dashboard/reporting metrics are calculated from authoritative Palermo application data; AI-generated values are not authoritative business metrics.
- `D-061` Dashboard metrics use explicit reporting periods and documented metric definitions; refund/adjustment treatment is added only when corresponding workflows are approved.
- `D-062` Customer preference and quiz reporting is aggregated wherever individual identity is unnecessary.
- `D-063` Security-relevant and privileged administrative actions are audit logged with actor, action, target, time, outcome, and appropriate correlation/change metadata without secrets.
- `D-064` Audit-log management permits authorised viewing/search/filtering and policy-driven retention, but ordinary administrators cannot alter historical audit-event content.
- `D-065` Backup management provides an authorised mechanism to invoke/create approved data backups, record status/metadata, and support a documented restore procedure; operations are restricted and audited.
- `D-066` Dashboard reporting interfaces are read-mostly; business mutations occur through dedicated authorised admin workflows rather than report visualisations.

## Derived Inventory and Production Batch Scope

- `D-067` Inventory is tracked at sellable perfume-variant level and available stock accounts for reserved/committed quantities.
- `D-068` Inventory quantity changes are attributable to an inventory movement ledger recording variant, quantity delta, source/reason, reference, and time.
- `D-069` Production Batch Management tracks finished-perfume batches associated with sellable variants; raw-material procurement, formulation, manufacturing scheduling, and ERP functions are outside baseline.
- `D-070` Recording a production batch does not alter sellable inventory until an authorised release creates the corresponding inventory movement exactly once.
- `D-071` Administrators can view variant stock and identify low-stock variants using configured thresholds; automatic purchasing/replenishment/production ordering is out of scope.
- `D-072` Inventory reservation/commitment uses atomic persistence controls so concurrent transactions cannot allocate more units than available; failed/expired reservations release safely.

## Derived Reviews, Loyalty and Promotion Scope

- `D-073` Authenticated customers may submit one rating plus short text review per purchased perfume; reviews are public and admins may hide/remove inappropriate reviews; no replies/likes/follows/DMs/community feed.
- `D-074` The baseline community capability is the shared public review space; no separate social-network platform is built.
- `D-075` Customers earn simple loyalty points from qualifying completed orders and may redeem them under an administrator-configured rule; no tiers/VIP system.
- `D-076` Subscription management is a basic customer opt-in/opt-out subscription record; recurring Stripe billing and automatic recurring perfume orders are not in baseline.
- `D-077` Authenticated customers receive a unique referral code/link; a qualifying successful referral may award configured loyalty points.
- `D-078` Administrators may create/manage basic promotion codes with discount, active dates/status, and eligibility rules, extending the approved promo-code cart workflow.
- `D-079` Administrators may create/manage promotional content records intended for social media; Palermo is not a full social-media scheduler.
- `D-080` AI-assisted promotional video follows generate → preview → administrator approve/reject, uses approved/copyright-safe assets, and does not automatically post content.

## Architecture, Security and NFR Interpretation

- `D-081` Palermo uses a modular-monolith architecture with Next.js + TypeScript, Prisma, and Supabase PostgreSQL; no microservices.
- `D-082` Security-sensitive/business-critical operations are server authoritative, including price, stock, discounts, checkout, payment, RBAC, and order state.
- `D-083` Deployment uses HTTPS; secrets are environment/server managed and never committed/exposed to client bundles; authentication credentials are never stored plaintext.
- `D-084` Authenticated sessions expire after inactivity and can be invalidated on logout, password/security events, and account deactivation; exact timeout is set during measurable NFR refinement.
- `D-085` External/user inputs are validated at trust boundaries; user-safe errors hide internal details; logs contain necessary context without passwords, raw card data, or secrets.
- `D-086` Performance requirements use measurable criteria under a documented capstone test environment rather than fake production SLAs; third-party latency is measured separately.
- `D-087` The responsive web UI targets keyboard-accessible core workflows, semantic labelling, adequate contrast, and WCAG 2.2 AA where applicable.
- `D-088` Browser support targets current major Chromium, Firefox, and Safari families; legacy browser support is not promised.
- `D-089` Only data required by approved requirements is collected; optional/sensitive data remains optional and exact retention/deletion periods are resolved in the DPIA.
- `D-090` Automated database backup capability plus a documented/tested restore procedure is required; zero-data-loss disaster recovery is not promised.
- `D-091` Each requirement ultimately traces to test evidence using unit, integration, and end-to-end tests as appropriate; critical journeys and security/transaction rules receive explicit coverage.
- `D-092` Pull requests must pass automated quality checks before merge; dev/test configuration is separated from production-like configuration and production secrets are not used in CI fixtures.
- `D-093` Stripe, AI, email, and delivery integrations sit behind internal interfaces/adapters so mocks/sandboxes can replace providers during testing.
- `D-094` AI-generated recommendations/promotional content are clearly identified where appropriate and AI promotional media uses approved/copyright-safe assets.
- `D-095` Application errors, security events, and integration failures are logged with correlation/request identifiers where practical; no enterprise-scale observability platform is required.
- `D-096` Database constraints and transactions enforce business invariants, including concurrency, transaction safety, and idempotency requirements.

## DPIA, Boundaries, Testing and Implementation

- `D-097` Palermo explicitly classifies stored data categories: account/contact, addresses, fragrance preferences, order/payment references, support/feedback, admin/audit, and technical logs; raw card and medical/health data are excluded.
- `D-098` Optional data remains optional and data collection interfaces communicate relevant purpose at the point of collection rather than relying only on one generic policy.
- `D-099` Customers access only their own account-specific data; administrators receive only RBAC-authorised data; AI receives only minimum context required for a specific request.
- `D-100` Account deactivation is distinct from deletion; historical orders, invoices, payment references, and required audit records may be retained independently of editable profile data; exact durations are documented in the retention schedule.
- `D-101` Customer/order data sent to AI services is minimised and purpose-specific; AI never receives unrestricted database records or arbitrary customer histories.
- `D-102` The DPIA assesses each major processing activity by data collected, purpose, access, external processors, risks, mitigations, retention, and residual risk.
- `D-103` The architecture diagram shows one Palermo modular monolith containing UI, server/domain logic, integration adapters, and Prisma data access connected to Supabase PostgreSQL and approved external services.
- `D-104` Architecture/security diagrams show Browser ↔ Palermo Server ↔ Database ↔ External Provider trust boundaries; crossing a trust boundary triggers appropriate validation/authentication.
- `D-105` Every approved requirement traces Requirement → Use Case → Design/Data/UI → GitHub Issue → Pull Request → Test → Result.
- `D-106` Local/dev and controlled test/demo environments use seeded non-real customer data; Stripe remains test mode, delivery uses the simulator, and AI may be mocked where deterministic testing is required.
- `D-107` Critical domain rules use unit tests, database/service boundaries use integration tests, major journeys use E2E tests, and RBAC/idempotency/concurrency include negative-path coverage.
- `D-108` Development uses an iterative Agile approach driven by GitHub issues, scoped branches, PR review, and weekly progress validation rather than claiming unperformed enterprise Scrum ceremonies.
- `D-109` Implementation order follows dependency: foundation/auth/data → catalogue → discovery/profile → cart/order/payment → delivery → AI/support → admin/reporting → derived extras → hardening/testing.
- `D-110` After SRS v1.0 freeze, new business functionality requires a documented change decision; bugs and implementation detail do not count as scope changes.
- `D-111` Final demo uses controlled seeded data and sandbox/simulated integrations to demonstrate approved behaviour end-to-end without representing demo activity as production operation.
