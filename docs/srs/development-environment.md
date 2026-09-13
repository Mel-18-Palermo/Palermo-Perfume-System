# Software Development Environment and File/Folder Structure

## Purpose

This document defines the planned software development environment and target repository structure for implementation of the Palermo Perfume System.

At the time of this SRS baseline, application implementation has not yet started. The repository contains the SRS/documentation baseline only. Therefore, the application folder structure below is a proposed implementation structure consistent with the approved architecture, not a claim that all listed directories already exist.

Exact library versions, deployment provider, authentication provider and some supporting test/developer tools remain implementation decisions unless separately frozen.

## Development environment

### Application platform

Approved baseline:

- Next.js
- React
- TypeScript

Next.js provides the web application runtime and routing/application framework. React provides the component UI model. TypeScript is used for typed application code and contracts.

The architecture is a modular monolith rather than a microservice system.

### Data access and database

Approved baseline:

- Prisma ORM/data access
- Supabase PostgreSQL

Prisma provides the application data-access/migration layer. PostgreSQL is the authoritative relational data store.

Critical multi-record operations such as checkout, inventory reservation/commit and protected business outcomes must use appropriate database constraints and transactions.

Supabase is treated as managed PostgreSQL infrastructure; it is not a business actor in use-case or data-flow models.

### Payment

Approved baseline:

- Stripe test/sandbox environment

Payment integration is isolated behind Palermo's internal payment-provider interface/adapter.

Palermo stores only approved payment state/provider references required for its own order workflow and does not store raw PAN/CVV.

### AI

AI features use a replaceable provider interface/adapter.

The exact provider/model may be selected/configured during implementation. The development environment must support:

- deterministic mock/stub AI responses for testing;
- controlled test provider configuration where live integration is required;
- minimised approved request context;
- failure/timeout testing without breaking core commerce.

### Email

Email delivery is accessed through an integration adapter.

Provider selection/configuration remains an implementation/deployment decision unless separately frozen.

Development/testing may use a safe test configuration or mock adapter.

### Delivery

The capstone baseline uses an internal delivery simulator behind a `DeliveryProvider`-style abstraction.

No production courier account is required for the baseline.

The simulator supports controlled shipment/tracking transitions for repeatable tests and demonstrations.

### Version control and collaboration

Repository management uses:

- Git
- GitHub
- protected `main` integration branch;
- GitHub Issues;
- short-lived scoped branches;
- Pull Requests;
- rebase merge workflow.

Normal workflow:

Issue -> Branch -> Commit -> Pull Request -> Review -> Rebase Merge -> Delete Branch

There is no shared `develop` branch.

### Documentation and modelling

Documentation artefacts are maintained under `docs/`.

Current tools/formats include:

- Markdown for written technical sources;
- CSV/text where structured registries or validation profiles are more appropriate;
- Mermaid for the final System Architecture source and detailed technical modelling where retained;
- draw.io / diagrams.net for manually composed final report diagrams;
- SVG for final report diagram exports.

### Development editor and operating system

The project does not require one mandatory editor or desktop operating system.

Developers may use an editor/IDE capable of supporting TypeScript, Git and the selected Node.js/Next.js toolchain.

Repository configuration files such as `.editorconfig` are used where possible to reduce formatting differences between environments.

### Runtime and package management

A Node.js runtime compatible with the selected Next.js version will be required when implementation begins.

The exact Node.js version and JavaScript package manager should be frozen in the implementation scaffold/configuration rather than guessed in the SRS.

Once selected, the project should commit the relevant version/package-manager metadata and lockfile so all developers and CI use a reproducible dependency set.

### Browser/test environment

Final validation targets current stable major browser families defined by the NFR baseline:

- Chrome
- Firefox
- Edge
- Safari

Responsive checks are performed at the documented validation widths:

- 375 px
- 768 px
- 1440 px

The controlled staging/test environment uses seeded non-real data and test/sandbox integrations.

### Security configuration

Environment-specific secrets must be stored outside source control.

The implementation environment must prevent commits of:

- database credentials;
- authentication secrets/tokens;
- Stripe secret keys;
- AI provider secrets;
- email-provider credentials;
- real customer data;
- raw payment-card data.

Public/client-safe configuration must be distinguished from server secrets.

Deployed test/staging connections carrying sensitive data use HTTPS/TLS.

## Current repository structure

At the SRS stage, the repository primarily contains governance and documentation:

```text
Palermo-Perfume-System/
├── .github/
├── docs/
├── .editorconfig
├── .gitignore
├── CONTRIBUTING.md
├── README.md
└── SECURITY.md
```

The absence of an application scaffold at this stage is intentional: implementation begins after the SRS v1.0 baseline is reviewed/frozen.

## Current documentation structure

```text
docs/
├── diagrams/
├── privacy/
├── project-management/
├── requirements/
├── security/
├── srs/
├── testing/
└── ui/
```

Primary responsibilities:

- `requirements/` — functional/NFR registries, decisions, derived requirements, data dictionary, logical ERD and traceability;
- `srs/` — report-supporting technical SRS content and detailed use-case specifications;
- `diagrams/` — report-facing diagram workspace;
- `ui/` — UI requirements, design evidence and wireframes;
- `privacy/` — DPIA, retention and privacy risk material;
- `security/` — additional security design/supporting material;
- `testing/` — testing plan, validation profile, cases/evidence/results;
- `project-management/` — methodology, implementation planning, deliverables, schedule/WBS and supervisor/project evidence.

## Proposed implementation structure

The following structure is the target organisation for the modular-monolith application. Names may be refined when the scaffold is created, but the architectural separation should remain.

```text
Palermo-Perfume-System/
├── .github/
│   └── workflows/
│
├── docs/
│   ├── diagrams/
│   ├── privacy/
│   ├── project-management/
│   ├── requirements/
│   ├── security/
│   ├── srs/
│   ├── testing/
│   └── ui/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.*
│
├── public/
│
├── src/
│   ├── app/
│   │
│   ├── components/
│   │
│   ├── modules/
│   │   ├── identity/
│   │   ├── catalogue/
│   │   ├── discovery/
│   │   ├── personalisation/
│   │   ├── commerce/
│   │   ├── inventory/
│   │   ├── delivery/
│   │   ├── support/
│   │   ├── administration/
│   │   └── participation/
│   │
│   ├── integrations/
│   │   ├── payment/
│   │   ├── ai/
│   │   ├── email/
│   │   └── delivery/
│   │
│   ├── lib/
│   │   ├── db/
│   │   ├── auth/
│   │   ├── validation/
│   │   ├── logging/
│   │   └── config/
│   │
│   └── types/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── package.json
├── tsconfig.json
└── <package-manager-lockfile>
```

## Folder responsibilities

### `src/app/`

Next.js application routing, layouts and application entry surfaces.

This layer should coordinate approved application/domain services rather than contain uncontrolled business logic directly in UI components.

### `src/components/`

Reusable presentational/interface components shared across application surfaces.

Domain-specific components may remain within a module if they are not genuinely shared.

### `src/modules/`

Primary business-domain boundaries of the modular monolith.

Each module may contain its own domain logic, application services, validation schemas/types and module-specific UI/server helpers as appropriate.

The goal is cohesive domain ownership, not artificially creating separate deployable services.

### `src/integrations/`

Provider-specific implementation adapters.

Examples:

- Stripe payment adapter;
- selected AI provider adapter;
- email provider adapter;
- internal delivery simulator / future delivery adapter.

Provider SDKs should be concentrated here or behind equivalent adapter boundaries rather than spread through core domain logic.

### `src/lib/`

Cross-cutting infrastructure shared by modules, such as:

- database client/access support;
- authentication/session helpers;
- common validation primitives;
- structured logging;
- environment/configuration parsing.

Cross-cutting code should remain narrow; domain business rules should not become an unstructured global utility layer.

### `prisma/`

Database schema, reviewed migrations and repeatable seed support.

The detailed SRS data dictionary/logical ERD guides this implementation, but exact Prisma model names/indexes may be refined where implementation requires it without changing approved business semantics.

### `tests/`

Automated verification grouped by test level:

- `unit/` — isolated deterministic rules;
- `integration/` — persistence, transaction and adapter boundaries;
- `e2e/` — complete customer/administrator journeys.

Additional fixtures/helpers may be added under the test hierarchy when implementation begins.

### `public/`

Static public assets required by the Next.js application.

Copyright/asset approval rules still apply to public/promotional media.

### `.github/workflows/`

CI automation such as build/type/lint/test/security checks once application implementation starts.

## Dependency direction

The target structure should preserve these principles:

- UI/routes call approved application/domain services;
- domain rules do not depend directly on provider SDKs;
- integrations implement internal provider contracts;
- Prisma/database access remains on trusted server-side paths;
- external/user inputs are validated at trust boundaries;
- customer/admin authorisation is enforced independently of UI visibility;
- payment, inventory and order invariants are protected by server logic plus persistence controls.

The folder structure is intended to make these boundaries visible in the repository.

## Configuration strategy

Implementation should provide an `.env.example` containing variable names and safe descriptions only.

Secret values must never be committed.

Configuration should fail early when mandatory environment values are missing/invalid.

Separate local/test/staging provider credentials should be used rather than sharing production-like secrets across environments.

## Build and execution workflow

Once the application scaffold exists, a normal developer workflow is expected to be:

1. obtain the repository;
2. use the project-pinned runtime/package manager;
3. install locked dependencies;
4. copy/configure local environment variables from safe documentation;
5. prepare/apply the development database schema;
6. seed controlled test data;
7. run the development server;
8. execute lint/type/test commands before PR submission.

Exact command names are defined by the implementation scaffold/package scripts rather than fabricated in the SRS before those files exist.

## Environment reproducibility

When implementation begins, reproducibility should be provided by:

- committed dependency lockfile;
- runtime/package-manager version metadata;
- reviewed Prisma migrations;
- repeatable seed command;
- `.env.example`;
- CI using the same project configuration;
- documented setup steps.

This reduces "works on my machine" differences across team members.

## Final SRS interpretation

This development-environment section establishes the technology and organisational baseline required for implementation.

It intentionally distinguishes:

- approved architecture/technology decisions;
- current repository state;
- proposed folder organisation;
- details that will only become exact when the application scaffold is created.

This prevents the SRS from presenting non-existent implementation files or unfrozen library/version choices as completed facts.
