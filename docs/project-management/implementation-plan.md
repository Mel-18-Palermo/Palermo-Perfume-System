# Implementation Plan

## Purpose

This plan defines the controlled implementation sequence for the Palermo Perfume System after the Final SRS v1.0 baseline is frozen.

The implementation follows the approved modular-monolith architecture and prioritises dependency order, security-sensitive foundations and demonstrable end-to-end value. It does not represent the capstone demo environment as a production deployment.

## Approved technical baseline

The implementation baseline is:

- Next.js + TypeScript modular monolith;
- Prisma data access;
- Supabase PostgreSQL;
- server-authoritative security-sensitive/business-critical operations;
- Stripe test/sandbox integration behind an internal payment adapter;
- email integration behind an internal adapter;
- AI integration behind an internal provider interface;
- internal delivery simulator behind a replaceable delivery-provider boundary;
- seeded non-real data for development/test/demo;
- GitHub issue -> branch -> pull request -> review -> merge workflow.

Microservices are not part of the baseline.

## Implementation principles

1. Implement in dependency order rather than by screen count.
2. Keep business rules on trusted server-side boundaries.
3. Use database constraints and transactions to protect invariants.
4. Keep provider SDKs behind integration adapters.
5. Do not expand business scope during implementation without a documented change decision.
6. Keep each implementation unit traceable to approved requirements/use cases.
7. Build automated tests alongside the relevant behaviour.
8. Use sandbox/simulated integrations until a separately approved production configuration exists.

## Environment strategy

### Local development

Used for active development, unit tests and developer integration tests.

- developer-controlled environment variables;
- local/test database or isolated Supabase development project;
- seeded non-real data;
- provider mocks/stubs where practical.

### Controlled test/staging

Used for PR/integration validation, end-to-end testing and final acceptance evidence.

- production-like application configuration without production secrets/data;
- Stripe test mode;
- delivery simulator;
- test email configuration;
- AI test configuration or deterministic mock depending on test objective;
- repeatable database seed.

### Final demonstration

Uses a known commit/version and controlled seeded dataset.

The demonstration is a capstone test/demo environment, not a representation of live production operations.

## Implementation phases

### Phase 1 — Foundation, authentication and core data

Build the technical and security foundation required by every later domain.

Scope:

- Next.js/TypeScript application foundation;
- configuration and environment validation;
- Prisma/Supabase connection;
- initial database schema/migrations;
- seed framework;
- customer registration/verification/login/logout/password reset;
- customer account lifecycle;
- profile/address foundations;
- administrator identity/RBAC foundation;
- validation/error/logging conventions;
- CI lint/type/test checks.

Exit gate:

- application boots in local/test environment;
- migrations and seed are repeatable;
- authentication lifecycle tests pass;
- protected routes/actions enforce the initial ownership/RBAC boundary.

### Phase 2 — Catalogue and product administration

Scope:

- fragrance families and notes;
- perfumes and sellable variants;
- images and approved catalogue metadata;
- collection relationships;
- archive/status behaviour;
- administrator catalogue management;
- catalogue read APIs/server actions.

Exit gate:

- administrator can maintain the approved catalogue model;
- public catalogue data is served from authoritative persistence;
- archived/ineligible products do not appear as active sellable items.

### Phase 3 — Discovery, profile and fragrance experience

Scope:

- fragrance preference profile;
- favourite notes/intensity/sensitivity avoidance;
- deterministic fragrance identity generation;
- discovery search/filtering;
- fragrance wheel/journey/virtual fragrance presentation;
- comparison and suitability metadata;
- quiz data model and flow;
- recommendation candidate preparation.

Exit gate:

- Visitor/Customer discovery flows operate against current catalogue data;
- profile/identity rules are deterministic and tested;
- quiz/profile context is ready for the later AI adapter without making AI authoritative.

### Phase 4 — Cart, checkout, order, payment and inventory transaction core

This is the highest-risk business phase and receives explicit integration/negative-path tests.

Scope:

- Visitor temporary cart;
- authenticated persistent cart/customer ownership behaviour;
- wishlist;
- variant/customisation cart lines;
- live price/promotion validation;
- checkout revalidation;
- order snapshots;
- short-lived inventory reservation;
- Stripe test payment adapter;
- server-side payment verification;
- idempotent order/payment/invoice/inventory finalisation;
- failure/timeout reservation release;
- inventory balance and movement ledger.

Exit gate:

- successful checkout produces one business outcome;
- duplicate/retry paths do not duplicate order/payment/invoice/inventory effects;
- concurrent limited-stock tests cannot oversell;
- failed payment safely releases reservation;
- raw PAN/CVV is not stored.

### Phase 5 — Delivery and order tracking

Scope:

- delivery-method configuration/snapshot;
- one shipment per order baseline;
- internal delivery simulator;
- tracking reference generation;
- controlled shipment transitions;
- customer order/tracking view;
- delivery confirmation source/time.

Exit gate:

- paid order can progress through the simulated delivery lifecycle;
- customer can view only their own tracking data;
- simulator remains behind the delivery-provider abstraction.

### Phase 6 — AI recommendations and customer support

Scope:

- AI provider interface/adapter;
- minimised approved recommendation context;
- recommendation output validation;
- generic public support;
- authenticated customer-specific support with ownership checks;
- bounded server-side tools/services for authoritative account/order facts;
- graceful provider timeout/failure handling;
- AI transparency labels;
- support/AI logging without sensitive data.

Exit gate:

- AI failure does not break catalogue/cart/order/payment;
- AI cannot invent or directly mutate authoritative commerce facts;
- customer-specific data is available only after authentication/ownership enforcement.

### Phase 7 — Administrator operations and reporting

Scope:

- product/inventory/production-batch operations;
- dashboard/reporting;
- period-based metrics;
- customer preference/quiz aggregates;
- review moderation;
- audit-event views;
- authorised backup controls/status where implemented;
- administrator account/permission management.

Exit gate:

- privilege matrix tests pass;
- high-impact actions create required audit events;
- report metrics use authoritative application data.

### Phase 8 — Derived participation and promotion scope

Scope:

- reviews/community baseline;
- loyalty account/points;
- basic subscription opt-in/out;
- referral code/referral outcome;
- promotion management;
- promotional-content records;
- AI-assisted promotional video generate -> preview -> approve/reject flow.

Exit gate:

- derived capabilities comply with the locked narrow baseline;
- no recurring Stripe billing, social network, auto-posting or unapproved business workflow is introduced.

### Phase 9 — Hardening, NFR validation and demo readiness

Scope:

- cross-browser/responsive/accessibility passes;
- load/search/database performance validation;
- dependency/security scans;
- error/logging review;
- backup/restore drill;
- DR rehearsal;
- full regression suite;
- traceability completion;
- seeded demo reset procedure;
- final known-limitations review.

Exit gate:

- System Testing Plan exit criteria are met or outstanding evidence is explicitly recorded;
- final demo build is tagged/identified by commit;
- seed/reset and demonstration steps are repeatable.

## Database and migration approach

Prisma migrations are version-controlled with application code.

Implementation rules:

- schema changes occur through reviewed migrations;
- destructive changes require explicit review;
- seed data must be repeatable and contain no real personal/payment data;
- database constraints enforce uniqueness/referential/business invariants where appropriate;
- multi-record critical operations use transactions;
- idempotency keys/unique constraints are used for protected transaction outcomes;
- migrations are validated against the controlled test environment before the final demo baseline.

The detailed logical ERD and data dictionary guide implementation but do not freeze exact Prisma naming/index choices unless separately approved.

## Integration implementation

### Stripe

- test/sandbox only for capstone implementation;
- provider-controlled payment entry;
- server-side verification;
- store provider references/status only as required;
- never store PAN/CVV;
- repeated/late results must be idempotent.

### Email

- adapter boundary for verification/reset and required system messages;
- failure handled without exposing provider internals;
- provider choice/configuration remains deployment detail unless separately frozen.

### AI

- provider adapter boundary;
- approved/minimised request context only;
- Palermo data remains authoritative;
- responses validated before presentation/use;
- failures isolated from critical commerce;
- generated/assisted content labelled where required.

### Delivery

- internal simulator is the baseline provider;
- no external courier integration is required for the capstone baseline;
- provider abstraction remains so a future courier implementation can replace the simulator without rewriting core order rules.

## Security and privacy implementation controls

Implementation must preserve:

- server-side authentication/authorisation;
- deny-by-default RBAC;
- ownership checks for customer-specific resources;
- validation at writable/trust boundaries;
- safe user-facing errors;
- environment-managed secrets;
- HTTPS in deployed test/demo environment;
- no plaintext credentials;
- no raw card storage;
- minimised AI context;
- append-oriented audit events for approved high-impact actions;
- retention/deactivation behaviour aligned with the DPIA/retention schedule.

## Development and merge workflow

For implementation work:

1. Start from an approved GitHub issue linked to requirement/use-case scope.
2. Create one scoped branch.
3. Implement the smallest coherent vertical/domain change.
4. Add/update tests.
5. Run local lint/type/test checks.
6. Open a PR to `main`.
7. Review for scope, security, architecture, data and test consistency.
8. Rebase merge after required checks pass.
9. Delete the merged branch.
10. Link implementation/test evidence back to traceability.

`main` remains the integration branch.

## CI and quality gates

Pull requests should run, as available:

- dependency install/build validation;
- lint;
- TypeScript type checking;
- automated unit tests;
- automated integration tests that can safely run in CI;
- selected E2E/smoke checks;
- migration/schema validation;
- secret/dependency/security checks.

Provider secrets or production credentials must not be used in CI fixtures.

## Scope and change control

After SRS v1.0 freeze:

- defects may be fixed without a scope-change decision;
- implementation detail may evolve while preserving approved behaviour;
- new business functionality requires a documented change decision before implementation;
- exact provider configuration, implementation class naming and internal refactoring do not automatically constitute business-scope changes.

This prevents deadline-driven feature expansion from invalidating the approved SRS baseline.

## Deployment and rollback approach

For the controlled test/demo environment:

1. identify the target commit;
2. verify environment configuration/secrets;
3. back up the current test database where relevant;
4. apply reviewed migrations;
5. deploy/build application;
6. run seed only when the environment is intended to be reset;
7. run smoke tests;
8. verify Stripe/email/AI/delivery test integrations;
9. verify key customer/admin journeys.

If deployment validation fails:

- stop further acceptance testing;
- preserve logs/evidence;
- roll back application deployment to the previous known-good commit where supported;
- restore the test database from the appropriate backup if a migration/data failure requires it;
- reopen/fix through normal issue/PR workflow.

The project does not claim zero-downtime deployment or zero-data-loss production recovery.

## Final handover/demo package

The final implementation baseline should identify:

- final commit/tag;
- environment setup instructions;
- required environment-variable names without secret values;
- migration command;
- seed/reset command;
- test/demo account setup;
- Stripe test-mode expectation;
- internal delivery simulator operation;
- AI/email test configuration notes;
- known limitations;
- final test summary and traceability evidence.

## Implementation completion criteria

Implementation is ready for final demonstration when:

- approved critical user journeys are implemented;
- critical security/transaction invariants are enforced;
- migrations/seed are repeatable;
- CI quality gates pass for the final baseline;
- required system-test evidence is complete or clearly documented as outstanding;
- no unresolved Critical defect remains;
- final demo can be reset and repeated using controlled seeded data.

This implementation plan does not create a production SLA, external-courier commitment, refund workflow, recurring subscription billing, split shipment capability or other scope beyond the frozen SRS.
