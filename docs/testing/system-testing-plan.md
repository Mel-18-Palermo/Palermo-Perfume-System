# System Testing Plan

## Purpose

This plan defines how the Palermo Perfume System will be verified against the approved functional requirements, non-functional requirements, architectural decisions and privacy/security constraints before final demonstration and acceptance.

The plan is intentionally implementation-agnostic where possible. It specifies the required verification coverage and evidence without claiming that tests have already passed.

## Test objectives

Testing will verify that:

- approved customer, visitor and administrator workflows behave as specified;
- authentication, ownership and RBAC boundaries are enforced server-side;
- catalogue, cart, checkout, payment, inventory and delivery state remain internally consistent;
- duplicate, retry, timeout and concurrent transaction paths do not create duplicate business outcomes;
- Stripe remains in test/sandbox mode and raw payment-card data is not stored by Palermo;
- AI features operate only on approved/minimised context and fail without affecting authoritative commerce functions;
- the internal delivery simulator behaves consistently with the approved shipment lifecycle;
- measurable non-functional acceptance criteria are validated using the shared NFR validation profile;
- test evidence can be traced back to the approved requirements.

## Test basis

The test basis is:

- `docs/requirements/functional-requirements.md`
- `docs/requirements/derived-requirements.md`
- `docs/requirements/non-functional-requirements.md`
- `docs/requirements/decision-register.md`
- `docs/requirements/data-dictionary.csv`
- `docs/privacy/dpia.md`
- `docs/privacy/retention-schedule.csv`
- `docs/testing/nfr-validation-profile.txt`
- approved use-case specifications under `docs/srs/use-cases/`

Where source requirements and project-defined measurable criteria differ in wording, the source requirement remains authoritative for traceability and the measurable criterion defines how the capstone implementation is verified.

## Test environments

### Local development

Used for rapid unit, component and developer integration testing.

- local development configuration;
- seeded non-real customer data;
- mock/stub external providers where useful;
- no production secrets or real payment data.

### Controlled test / staging environment

Used for integration, end-to-end, UAT and NFR validation.

- deployment representative of the final implementation;
- approved seeded demo dataset;
- Stripe test/sandbox mode;
- internal delivery simulator;
- email test configuration;
- AI provider may be real test configuration or deterministic mock depending on the test objective;
- application version/commit, browser version and test timestamp recorded with evidence.

## Test levels

### Unit testing

Unit tests verify deterministic domain rules in isolation.

Priority areas include:

- account lifecycle and eligibility rules;
- fragrance identity and rule-based recommendation inputs;
- price/discount calculations;
- promotion eligibility;
- cart quantity and customisation rules;
- cancellation eligibility;
- inventory availability and low-stock calculation;
- reservation expiry/commit/release logic;
- production-batch release exactly once;
- loyalty/referral rule calculations;
- validation helpers and state-transition guards.

External providers are mocked at this level.

### Integration testing

Integration tests verify database, service and adapter boundaries.

Priority coverage includes:

- Prisma/database constraints and transactions;
- account/profile persistence;
- catalogue and search persistence;
- cart/order/payment persistence;
- inventory reservation and movement ledger behaviour;
- Stripe adapter normal/failure/duplicate-result behaviour;
- AI adapter failure isolation and context minimisation;
- email adapter normal/failure responses;
- delivery-provider interface using the internal simulator;
- RBAC and ownership checks at server boundaries;
- audit-event creation for privileged/high-impact actions;
- backup metadata and restore-supporting behaviour where implemented.

### End-to-end testing

End-to-end tests verify complete user journeys through the deployed web application.

Minimum customer journeys:

1. Register -> verify -> sign in.
2. Browse/search/filter -> view perfume and variant.
3. Create/update fragrance preferences -> complete quiz/recommendation flow.
4. Add/update/remove cart items and apply valid/invalid promotion.
5. Sign in -> checkout -> successful Stripe test payment -> order confirmation/invoice.
6. Failed payment -> safe failure state -> reservation release.
7. View order -> track simulated shipment -> delivered state.
8. Submit an eligible review.
9. View loyalty/referral information.
10. Use generic support and authenticated order-specific support.

Minimum administrator journeys:

1. Authenticate as administrator.
2. Manage catalogue/product data.
3. View/manage inventory and production-batch release.
4. Manage promotions/content.
5. Moderate reviews.
6. View dashboard/reporting information.
7. Exercise authorised account/RBAC operations.
8. Generate/review AI-assisted promotional content where implemented.
9. Review audit information and approved backup controls.

### Negative and abuse-path testing

Negative-path testing is mandatory for security-sensitive and transaction-sensitive behaviour.

It includes:

- invalid credentials;
- unverified and deactivated customer login;
- Visitor/Customer attempts to access administrator functions;
- administrator lacking the required permission;
- attempts to access another customer's account/order data;
- malformed/invalid writable payloads;
- stale cart price or unavailable stock at checkout;
- invalid/expired promotion;
- duplicate checkout submission;
- repeated or late payment-provider result;
- payment failure/timeout;
- expired inventory reservation;
- concurrent checkout for limited inventory;
- AI timeout, provider failure, invalid output and unavailable AI service;
- duplicate production-batch release;
- duplicate review for the same purchased perfume;
- unsafe error-path inspection to confirm no stack traces/secrets/raw card data are exposed.

## Non-functional validation

The measurable NFR criteria in `docs/requirements/non-functional-requirements.md` are verified using `docs/testing/nfr-validation-profile.txt`.

The shared validation profile requires, where relevant:

- controlled staging environment;
- baseline seed and at least 5x seed dataset;
- 20 concurrent virtual users;
- p95 interpretation for latency measures;
- repeated performance runs where practical;
- current major browsers;
- defined customer and administrator key-page sets;
- seeded non-real personal data only;
- separate reporting of third-party provider latency where excluded by a criterion.

Major NFR validation groups are:

### Performance and scalability

- non-AI request p95 <= 2.0 s;
- key-page LCP <= 2.5 s;
- search/filter p95 <= 1.5 s under the defined 5x/20-user profile;
- key database operation p95 <= 500 ms;
- application error rate below 1% under the defined concurrency/scalability profile.

### Availability, recovery and resilience

- 4-hour staging acceptance window using one-minute health probes;
- at least 99% successful probes with no unplanned outage exceeding 5 consecutive minutes;
- automated backup scheduled at least every 24 hours;
- isolated restore drill completed within 60 minutes with integrity checks;
- documented DR rehearsal restoring a working staging service within 2 hours.

### Security and privacy

- protected-route and permission-matrix tests;
- no unresolved project-attributable Critical/High security findings before acceptance;
- no raw PAN/CVV storage;
- no secrets in repository/client bundles/logs;
- AI context minimisation checks;
- deactivation/retention behaviour checked against the DPIA/retention schedule;
- TLS/deployment encryption checks.

### Accessibility, usability and compatibility

- WCAG 2.2 AA target where applicable;
- zero Critical/Serious automated accessibility findings on agreed key pages;
- keyboard-only core-flow review;
- responsive checks at 375 px, 768 px and 1440 px;
- current stable Chrome, Firefox, Edge and Safari smoke testing;
- five-person task-based usability validation with at least 4/5 successful completion for agreed customer and administrator task sets.

### Reliability, integrity and maintainability

- transaction retry/failure suites;
- no duplicate protected business outcomes;
- no negative available inventory;
- CI lint/type/test checks;
- provider SDK usage confined to adapters;
- structured error/integration/security logging with no sensitive values.

## Test data

Only controlled project data is used.

The baseline dataset should include enough records to exercise:

- active/archived perfumes and variants;
- fragrance families, notes and discovery metadata;
- valid/invalid promotions;
- customer accounts in relevant lifecycle states;
- orders in relevant states;
- inventory balances, low-stock cases and reservations;
- reviews, loyalty and referral examples;
- administrator roles/permissions;
- support/AI test prompts;
- audit events and backup metadata where required.

The 5x dataset is a scale-test profile, not a forecast of production volume.

No real customer data, real card PAN/CVV, passwords, authentication tokens or unrelated sensitive data are required in fixtures.

## Traceability and evidence

Each approved requirement ultimately traces through:

Requirement -> Use Case -> Design/Data/UI -> GitHub Issue -> Pull Request -> Test -> Result

Test evidence should record, as applicable:

- test ID;
- linked requirement ID(s);
- scenario and preconditions;
- expected result;
- actual result;
- PASS / FAIL / BLOCKED status;
- application commit/version;
- environment;
- date/time;
- tester/reviewer;
- logs, screenshots, reports or automated output.

Automated test output and CI runs should be linked where available rather than copied manually.

## Defect handling

Defects are recorded as GitHub issues and linked to the failed test/requirement.

Suggested project severity:

- Critical — prevents a critical journey, creates data/security risk, or makes the system unsuitable for demonstration.
- High — major required behaviour fails with no acceptable workaround.
- Medium — required behaviour is incorrect but a limited workaround exists.
- Low — minor usability, visual, wording or non-blocking defect.

Critical and High defects affecting approved scope must be resolved or explicitly accepted with documented rationale before final acceptance.

## Entry criteria

System-level validation begins when:

- SRS v1.0 scope is frozen;
- the target implementation is deployable in the controlled test environment;
- required schema/migrations and seeded test data are available;
- relevant provider test configurations are available;
- critical implementation branches have passed PR quality checks.

## Exit criteria

The system is considered ready for final demonstration when:

- critical end-to-end journeys pass;
- security/RBAC/ownership negative paths pass;
- checkout/payment/inventory idempotency and concurrency tests pass;
- no unresolved Critical defects remain;
- unresolved High defects, if any, are explicitly assessed before demonstration;
- required NFR evidence has been collected or clearly marked as pending/not executed;
- the traceability record identifies test status for approved requirements;
- the final seeded demo environment is stable and repeatable.

## Reporting

A final test summary should state:

- scope tested;
- application version;
- environment;
- number of tests by PASS / FAIL / BLOCKED;
- unresolved defects by severity;
- completed NFR checks;
- known limitations;
- final recommendation for demonstration/acceptance.

No planned criterion is to be presented as a completed result until evidence exists.
