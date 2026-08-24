# Palermo Perfume System — Data Protection Impact Assessment

## 1. Purpose and status

This DPIA is the project-level privacy assessment for the Palermo Perfume System SRS. It implements the privacy baseline defined by D-097 through D-102 and evaluates major processing activities by data collected, purpose, access, external processors, risks, mitigations, retention and residual risk.

This document is a technical/SRS control artefact. It does not claim that a production legal review, contractual processor review or jurisdiction-specific compliance assessment has already been completed.

## 2. System boundary

Palermo is a Next.js + TypeScript modular monolith using Prisma with Supabase PostgreSQL. Approved external services include:

- an email delivery service for verification/password-reset messages;
- Stripe sandbox/test integration for payment processing;
- an AI service/API for bounded recommendation, support and promotional-generation tasks.

The baseline delivery provider is an internal simulator behind a replaceable provider interface.

Palermo does not intentionally collect or store raw payment-card PAN/CVV data. Fragrance sensitivity is limited to optional non-medical avoidance/preference data; medical/health-condition collection is outside scope.

## 3. Data subjects

| Data subject | Typical interaction | Privacy relevance |
|---|---|---|
| Visitor | public catalogue, temporary cart, quiz, public AI support | may create session-linked cart/quiz/support records without an account |
| Customer | account, profile, addresses, preferences, orders, reviews, loyalty/referral, support | primary personal-data subject |
| Administrator | privileged administration, moderation, inventory, reports, audit/backup operations | administrative identity and audit records |

## 4. Personal-data categories

| Category | Examples | Required/optional | Primary purpose |
|---|---|---|---|
| Account/contact | name, email, account status, verification state | required for customer account | authentication, account communication and ownership |
| Address | recipient name, address lines, suburb, state, postcode, country | required when needed for billing/delivery | order fulfilment and billing snapshots |
| Fragrance preferences | favourite notes, preferred intensity, optional non-medical sensitivity/avoidance | mostly optional after account creation | deterministic identity, personalisation and recommendations |
| Quiz/recommendation | quiz responses, attempt/session linkage, recommendation run/result metadata | optional | fragrance discovery and AI-assisted recommendation |
| Cart/session | visitor session key, selected variants, quantity, customisations, promo association | optional until shopping | temporary/persistent shopping state |
| Order/fulfilment | order items, immutable price/address/delivery snapshots, order status, shipment/tracking | required when ordering | fulfilment, invoice, tracking and historical integrity |
| Payment reference | provider name/reference and payment status | required for online payment | payment verification and transaction reconciliation |
| Review/community | rating, review text, purchase linkage, moderation status | optional | purchased-perfume reviews and moderation |
| Loyalty/subscription/referral | point balance/ledger, opt-in state, referral code/referral record | optional | derived customer participation features |
| Support/feedback | conversation/messages, bounded intent/context, explicit feedback | optional | customer support, follow-up and service improvement |
| Administrator/RBAC | admin email/status/role/permissions | required for administration | privileged access control |
| Audit/technical | actor/action/target/outcome/correlation IDs, application/security/integration logs | generated | security, accountability and troubleshooting |
| Backup metadata | trigger, requester where applicable, status/provider reference | generated | backup/restore accountability |

Excluded from the approved baseline:

- raw payment-card PAN/CVV/CVC;
- medical or health-condition data under fragrance sensitivity;
- unrelated demographic, psychological or sensitive-trait inference;
- unrestricted customer database/history transfer to AI providers.

## 5. Processing activities

### 5.1 Registration, authentication and account lifecycle

**Data:** name, email, credential/authentication state, verification state, account status.

**Purpose:** create and secure a customer account, verify email ownership, authenticate the customer, invalidate sessions on security/account events and support deactivation.

**Access:** the customer and server-side authentication/account logic; authorised support/administration only where a separate approved privileged workflow exists.

**External processor:** email delivery service receives the minimum recipient/message information necessary for verification or password recovery.

**Controls:** server-side validation, unique email identity, verified+ACTIVE login requirement, inactivity expiry, session invalidation, secure secret handling, user-safe errors.

**Residual risk:** Low–Medium.

### 5.2 Customer profile, addresses and fragrance preferences

**Data:** profile attributes, current delivery/billing addresses, favourite notes, preferred intensity, optional non-medical sensitivity/avoidance data, generated Fragrance Identity.

**Purpose:** profile management, delivery/billing preparation, deterministic identity generation and approved personalisation.

**Controls:** customer ownership checks, optional preference fields remain optional, no medical interpretation, point-of-collection purpose notice, one current delivery and billing address with immutable order snapshots at purchase.

**Residual risk:** Low–Medium.

### 5.3 Visitor cart and quiz/session processing

**Data:** opaque visitor session key, cart items/customisations, quiz attempt/responses, temporary recommendation/support context.

**Purpose:** allow approved public shopping/discovery capabilities without forcing account registration.

**Controls:** opaque session identifiers, no guest checkout, bounded retention, no unnecessary direct identity requirement, server-authoritative pricing and validation.

**Residual risk:** Low.

### 5.4 Order, invoice, payment and delivery processing

**Data:** customer ID, order/item snapshots, delivery/billing snapshots, payment provider reference/status, invoice, shipment/tracking state.

**Purpose:** complete and evidence an authorised customer purchase, process payment, issue invoice and provide shipment status.

**External processor:** Stripe receives card credentials through provider-controlled payment UI. Palermo stores/verifies provider references and status only.

**Controls:** authenticated ownership, server-authoritative price/stock/discount validation, bounded stock reservation, idempotency, immutable order snapshots, no raw card storage, one baseline shipment.

**Residual risk:** Low–Medium.

### 5.5 AI perfume recommendations

**Data:** only approved profile/quiz context plus current candidate catalogue data needed for the request; recommendation run/result metadata may be stored.

**Purpose:** rank/select/explain approved perfume candidates.

**External processor:** AI service/API.

**Controls:** data minimisation, no unrestricted customer history, no raw database access, authoritative catalogue facts remain inside Palermo, invalid/unverifiable AI output is rejected, AI failure does not block normal commerce.

**Residual risk:** Medium.

### 5.6 AI customer support

**Data:** user query, bounded support intent, minimum approved account/order/delivery facts only when the authenticated customer owns the record, support conversation data.

**Purpose:** public fragrance/product/policy assistance and authenticated own-order support.

**External processor:** AI service/API.

**Controls:** server-side tools enforce authentication/ownership independently of the AI, bounded intents, no refund/return approval authority, data minimisation, explicit feedback submission, bounded retention, failure isolation.

**Residual risk:** Medium.

### 5.7 Reviews, loyalty, subscription and referral

**Data:** customer/purchase linkage, rating/review text, loyalty points/transactions, opt-in state, referral code/referral outcome.

**Purpose:** purchased-perfume reviews and bounded customer participation features.

**Controls:** review purchase eligibility, one review per purchased perfume baseline, moderation, no social-network features, no recurring payment subscription, least data required for referral/points.

**Residual risk:** Low–Medium.

### 5.8 Administration, RBAC, audit and reporting

**Data:** administrator identity/status/role/permissions, privileged actions, audit events, aggregate reporting data.

**Purpose:** operate and secure the system, manage privileged functions and evidence high-impact actions.

**Controls:** separate admin identity, deny-by-default RBAC, least privilege, audit of privileged/security-relevant events, append-oriented historical audit content, aggregate preference/quiz reporting where individual identity is unnecessary.

**Residual risk:** Low–Medium.

### 5.9 Logging, monitoring and backups

**Data:** technical/application/security/integration events, correlation identifiers, backup metadata and database backup content.

**Purpose:** troubleshooting, security monitoring, operational recovery and auditability.

**Controls:** no password/token/PAN/CVV logging, restricted backup operations, rolling retention, controlled restore procedure, production personal data not required in development/demo environments.

**Residual risk:** Medium because backups may temporarily preserve data beyond the primary-store deletion point.

## 6. External processors and disclosures

| Service/boundary | Minimum data disclosed | Prohibited/excluded data | Control |
|---|---|---|---|
| Email delivery service | recipient email and verification/reset message data | unrelated profile/order history | purpose-specific request through adapter |
| Stripe payment service | payment/order reference, amount/context required by integration; card credentials handled by provider UI | Palermo storage of raw PAN/CVV | sandbox/test mode for capstone; server verification of provider result |
| AI service/API | minimised request-specific profile/quiz/catalogue/support/promotional context | unrestricted DB records, arbitrary customer history, secrets, raw card data | bounded server-side adapter/tool layer |
| Supabase PostgreSQL | approved Palermo application data | raw card data and excluded health data | managed database access controls; application uses Prisma/server boundary |
| Hosting/deployment provider | application runtime/logs as configured | unnecessary production personal data in demo/test | provider and region to be confirmed before production deployment |

No external courier is used in the baseline SRS; shipment status is generated by the internal delivery simulator.

## 7. Necessity and proportionality

The approved processing is limited to information required for the source requirements and locked derived modules. Palermo applies the following proportionality controls:

- registration collects only name, email and password;
- fragrance preference data is optional where not required;
- fragrance sensitivity is explicitly non-medical;
- Visitor features use opaque session linkage instead of requiring identity;
- Stripe handles raw payment credentials;
- AI receives request-specific minimised context rather than arbitrary records;
- customer-specific data requires authentication and ownership;
- administrator access is separately authenticated and RBAC-authorised;
- reporting uses aggregation where individual identity is unnecessary;
- development/demo uses controlled seeded non-real customer data.

## 8. Transparency and customer controls

The implementation should communicate purpose at the relevant collection point for optional or context-specific data rather than relying on one generic notice.

Required controls include:

- clear account/profile collection purpose;
- clear explanation that optional fragrance preferences drive personalisation/recommendation;
- AI-generated/AI-assisted output identification where appropriate;
- explicit submission/confirmation before official feedback is stored;
- account deactivation wording that does not falsely represent deactivation as deletion;
- access only to the authenticated customer's own account/order/support data.

Any production process for data-access, correction or deletion requests must be documented before production launch; this SRS does not claim that a jurisdiction-specific legal workflow has already been approved.

## 9. Retention

The project retention baseline is defined in `docs/privacy/retention-schedule.csv`.

Important distinctions:

- account deactivation is not deletion;
- historical order, invoice, payment-reference and required audit records may outlive editable profile data;
- backups use a rolling retention period and may temporarily contain data removed from the active database;
- retention periods are project baseline controls, not claims of statutory/accounting periods;
- before production launch, the client must confirm whether longer or different retention is required by applicable business/legal obligations.

## 10. Risk assessment method

Likelihood and impact are rated Low, Medium or High. Initial risk is the untreated privacy/security exposure. Residual risk is the expected exposure after the locked controls are applied.

The detailed risk register is `docs/privacy/dpia-risk-register.csv`.

Residual High risks are not accepted by this baseline. Any future change that creates a residual High risk requires design review before implementation.

## 11. Key residual risks

The principal remaining Medium risks are:

1. AI processing may disclose more customer context than intended if tool/context boundaries are implemented incorrectly.
2. Free-text support/review content may contain personal information voluntarily entered by users.
3. Backups may temporarily retain records after active-store deletion/anonymisation.
4. Provider hosting/location/contract terms are not yet frozen for production deployment.

These risks are managed through minimisation, ownership/RBAC controls, logging restrictions, rolling retention, seeded non-real demo data and a required provider review before production deployment.

## 12. DPIA implementation and verification checklist

- [ ] Point-of-collection notices exist for account, optional preference, support/feedback and relevant AI flows.
- [ ] Visitor session keys are opaque and do not embed direct identity.
- [ ] Customer ownership checks cover all account/order/invoice/shipment/support access paths.
- [ ] Admin routes/actions are covered by the RBAC permission matrix.
- [ ] No raw PAN/CVV is stored or logged.
- [ ] Fragrance sensitivity remains non-medical.
- [ ] AI adapters/tools expose only purpose-specific minimum context.
- [ ] AI support cannot bypass ownership/authorisation checks.
- [ ] Public review presentation does not expose customer email/internal identifiers.
- [ ] Logs are checked for secrets, tokens and excessive personal data.
- [ ] Backup access is restricted and restore operations are audited.
- [ ] Retention cleanup/manual-review procedure is documented for every retention category.
- [ ] Demo/test environments use seeded non-real customer data.
- [ ] Production hosting/provider region, contract/data-use settings and retention implications are reviewed before production launch.
- [ ] DPIA is revisited if new business functionality, new data categories or new external processors are approved after SRS freeze.

## 13. Traceability

Primary decisions:

- D-005, D-006
- D-032, D-033
- D-039 through D-043
- D-048 through D-056
- D-057 through D-065
- D-083 through D-090
- D-093 through D-102
- D-106, D-110, D-111

Primary NFRs:

- NFR-SEC-001
- NFR-AUTHN-001
- NFR-AUTHZ-001
- NFR-PRIV-001
- NFR-ENC-001
- NFR-AUDIT-001
- NFR-LOG-001
- NFR-SESSION-001
- NFR-AITRANS-001
- NFR-COPYRIGHT-001
- NFR-MON-001
- NFR-BACKUP-001
- NFR-RECOVERY-001
