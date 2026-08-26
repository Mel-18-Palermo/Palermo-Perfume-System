# Palermo Perfume System — Implementation Handbook

Status: **Implementation control baseline — freeze before feature work**

This handbook is mandatory for every implementation issue and pull request. Where an issue is more restrictive, the issue wins. Where an issue appears to conflict with this handbook, stop and ask the technical owner before implementing.

Related canonical material:
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/srs/development-environment.md`
- `docs/development/ownership-map.md`
- `docs/development/frontend-contracts.md`
- `docs/ui/design-system.md`
- canonical requirements/decisions under `docs/requirements/`

## 1. Architecture

Palermo is a **modular monolith** built with:
- Next.js
- React
- TypeScript
- Prisma
- Supabase PostgreSQL
- Stripe sandbox
- replaceable AI/email adapters
- internal delivery simulator

The browser is never authoritative for protected business outcomes.

Server authority includes:
- identity/session state;
- authorisation/RBAC;
- catalogue/admin eligibility;
- price/promotion validation;
- checkout eligibility;
- order/payment state;
- inventory reservation/commit/release;
- shipment state;
- loyalty/referral calculations;
- moderation state;
- AI tool permissions/context;
- security/privacy enforcement.

No frontend task may duplicate or override these rules locally.

## 2. Frozen repository shape

```text
Palermo-Perfume-System/
├── .github/workflows/
├── docs/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.*
├── public/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── contracts/
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
│   ├── integrations/
│   │   ├── payment/
│   │   ├── ai/
│   │   ├── email/
│   │   └── delivery/
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── db/
│   │   ├── logging/
│   │   └── validation/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
├── tsconfig.json
└── <single lockfile>
```

Rules:
1. Do not create an alternative top-level app architecture.
2. Do not create second `components`, `utils`, `services`, `api`, `models` or `types` trees.
3. No microservices, separate API repo, standalone Node server or second frontend.
4. Domain code stays in the owning module unless genuinely cross-cutting.
5. `src/lib/` is not a dumping ground for domain logic.
6. Provider SDK code stays behind `src/integrations/`.
7. Prisma/database access stays server-side.
8. Shared DTO/contracts live only in `src/contracts/`.

## 3. Protected areas

Technical-owner protected unless the issue explicitly permits edits:

```text
prisma/**
src/contracts/**
src/integrations/**
src/lib/auth/**
src/lib/config/**
src/lib/db/**
src/lib/logging/**
src/lib/validation/**
.github/workflows/**
.env.example
package.json
tsconfig.json
```

Protected concerns regardless of path:
- schema/migrations;
- auth/session;
- RBAC;
- Stripe/payment;
- checkout/order state;
- inventory transactions;
- AI provider/tools;
- secrets/config;
- security/privacy;
- CI/deployment;
- shared contracts.

If a feature needs a protected change, raise the dependency. Do not improvise.

## 4. Dependency policy

No contributor may add/remove/upgrade a runtime dependency without explicit approval.

This includes:
- state managers;
- form frameworks;
- component libraries;
- validation libraries;
- HTTP clients;
- CSS frameworks;
- auth SDKs;
- ORM/database libraries;
- payment/AI SDKs;
- chart/date/icon packages.

The scaffold freezes runtime, package manager, lockfile, framework versions and scripts. After that:
- one package manager;
- one lockfile;
- no deleting/recreating lockfiles to “fix” local issues;
- no force/override dependency changes without approval.

## 5. TypeScript

Required:
- strict mode;
- shared typed contracts at trust boundaries;
- `unknown` + validation for untrusted data;
- narrow domain states.

Prohibited:
- `any`;
- `@ts-ignore`;
- `@ts-nocheck`;
- unexplained casts;
- duplicated DTOs;
- locally invented copies of canonical statuses;
- `Record<string, any>`;
- non-null assertions used to hide missing-state handling.

## 6. Server/client boundary

1. Prefer server-side data loading where appropriate.
2. Use client components only for required browser interactivity.
3. Never expose server secrets to client bundles.
4. Never import Prisma/provider SDKs into client code.
5. UI visibility is not authorisation.
6. Browser totals are never checkout authority.
7. Browser/provider callback success is not order finalisation.
8. Customer/admin browser code never calls Stripe/AI/email providers directly.

## 7. API/data access

Feature components must not scatter raw network calls.

Prohibited:
```ts
fetch("/api/products")
```

inside arbitrary React components.

Use the approved client:
```ts
api.catalogue.list(...)
api.catalogue.get(...)
api.cart.get(...)
api.cart.addItem(...)
api.checkout.submit(...)
api.orders.get(...)
```

The same contract must support deterministic mocks and real server calls without redesigning components.

## 8. State ownership

URL:
- search;
- filters;
- pagination;
- sort;
- shareable comparison state where approved.

Local component state:
- dialogs;
- tabs/disclosures;
- temporary form/UI interaction.

Server authority:
- account/profile;
- cart;
- wishlist;
- order;
- payment;
- shipment;
- inventory;
- reviews/moderation;
- loyalty/referral;
- promotions;
- admin state.

Do not add global client state management without approval.

## 9. Required data states

Every data-driven surface implements applicable:
- loading;
- success;
- empty;
- error;
- disabled/processing;
- unauthenticated/forbidden.

Do not merge happy-path-only pages.

## 10. Form rules

All forms require:
- visible labels;
- required/optional state;
- semantic input type;
- inline errors;
- server error handling;
- duplicate-submit prevention;
- accessible error association;
- keyboard usability;
- preserved valid input after recoverable failure.

No placeholder-only labels. No invented fields.

## 11. Shared UI

Expected primitives under `src/components/ui/`:
- Button
- Input
- Textarea
- Select
- Checkbox
- RadioGroup
- FormField
- Card
- Badge
- Alert
- Dialog
- Drawer
- Tabs
- Table
- Pagination
- Skeleton
- Spinner
- EmptyState
- ErrorState

Feature code consumes primitives. Do not fork `ProductButton`, `AdminInput`, etc.

## 12. Styling

Follow `docs/ui/design-system.md`.

Hard rules:
- no arbitrary fonts;
- no arbitrary colours;
- no random spacing;
- no random radii/shadows;
- no one-off breakpoints;
- no emoji UI icons;
- no page horizontal scrolling at 375 px.

Visual token violations may be rejected before functionality review.

## 13. Responsive baseline

Mandatory validation:
- 375 px
- 768 px
- 1440 px

Requirements:
- mobile-first;
- no clipped content;
- no accidental horizontal page scroll;
- primary touch targets >= 44×44 CSS px;
- tables adapt or locally scroll;
- desktop content width constrained;
- responsive behaviour deliberate between validation widths.

## 14. Accessibility

Target WCAG 2.2 AA.

Minimum:
- semantic HTML;
- heading order;
- keyboard access;
- visible focus;
- correct button/link semantics;
- labels;
- accessible names for icon controls;
- meaningful alt text;
- sufficient contrast;
- no colour-only state;
- reduced-motion respect;
- no keyboard traps;
- meaningful error feedback.

Accessibility is Definition of Done.

## 15. Security/privacy

Never commit:
- `.env`;
- keys/passwords/tokens;
- database credentials;
- Stripe/AI/email secrets;
- real customer data;
- raw PAN/CVV;
- private logs.

Required:
- synthetic/seeded demo data;
- server validation;
- server authorisation;
- least privilege;
- provider calls behind trusted boundaries;
- minimised AI context;
- safe end-user errors;
- no sensitive payload logging.

## 16. Domain hard rules

### Auth/account
- registration begins pending verification;
- only verified/active customer may normally log in;
- deactivation invalidates sessions;
- no invented reactivation;
- server enforces email uniqueness.

### Catalogue/discovery
Approved filters:
- note
- family
- price range
- intensity
- occasion
- mood
- weather

No brand filter unless requirements change.

### Cart/checkout
- Visitor may use temporary cart.
- Checkout requires authenticated Customer.
- No guest checkout.
- Price/promo/stock revalidated server-side.
- UI totals are display-only.

### Payment/order/inventory
- Stripe sandbox baseline.
- No PAN/CVV storage.
- Payment lifecycle separate from order lifecycle.
- Duplicate checkout/callback handling idempotent.
- Inventory correctness enforced by server/database.
- One baseline shipment; no split shipment without scope change.

### AI
- not authoritative for commerce/account/payment/inventory;
- failure must not break core commerce;
- provider/model replaceable;
- minimised approved context;
- no unrestricted DB/history access.

### Delivery
- simulator is internal;
- no invented production courier integration.

## 17. Validation

Scaffold must expose scripts for:
- lint;
- type-check;
- tests;
- production build.

Use:
- unit tests for deterministic rules;
- integration tests for persistence/transaction/adapter boundaries;
- e2e for presentation-critical journeys;
- responsive/manual evidence for UI.

Never mark validation complete without running it.

## 18. Deployment and Vercel control

Vercel is the approved deployment platform for implementation previews and the controlled production/demo deployment path.

Deployment model:

```text
feature branch push
      ↓
GitHub Pull Request
      ↓
CI checks + Vercel Preview Deployment
      ↓
review / validation
      ↓
approved merge to main
      ↓
Vercel Production Deployment
```

Hard rules:

- contributors may trigger automated Preview Deployments by pushing to their assigned GitHub branch/PR;
- contributors do **not** receive manual deployment authority merely because they can create a preview;
- manual Vercel deployments, production redeploys, rollbacks, environment-variable changes, domain changes and project configuration changes are restricted to the technical owner;
- production deployment is normally triggered only by the approved GitHub merge/CI pipeline from protected `main`;
- no contributor may run `vercel deploy`, `vercel --prod`, or equivalent manual deployment commands for Palermo unless an issue explicitly authorises it;
- no one uploads built artefacts manually to production;
- no one copies production secrets into local files or PR comments to make a deployment work;
- CI/CD and the technical owner are the only approved production deployment authorities.

Environment separation:

```text
Preview
  PR / feature branches
  → preview/test database
  → Stripe test credentials
  → mock/test AI configuration
  → safe email test configuration
  → synthetic seeded data

Production / controlled demo
  protected main
  → separately controlled environment configuration
```

Preview deployments must **never** use the production database or production-like secrets.

The preview environment should be disposable and resettable. A contributor must be able to break or reseed a preview without risking the controlled production/demo environment.

Expected merge gate once application CI is active:

```text
Lint                 ✓
Type-check           ✓
Automated tests      ✓
Production build     ✓
Vercel Preview       ✓
Required review      ✓
```

A successful Vercel preview is evidence that the branch can be built/deployed; it does not replace application tests, security review, or functional review.

Do not introduce a permanent shared `develop` branch solely for deployment. PR previews plus protected `main` are the default model. A separate staging/demo environment or branch may be introduced later only if there is a demonstrated need and it is explicitly approved.

---

## 19. Git workflow

**1 issue → 1 short-lived branch → focused commits → 1 PR → review → rebase merge**

Branch patterns:
- `feat/<issue>-<short-name>`
- `fix/<issue>-<short-name>`
- `test/<issue>-<short-name>`
- `docs/<issue>-<short-name>`
- `chore/<issue>-<short-name>`

No direct `main`, no shared `develop`, no unrelated work, no authorship rewriting.

## 20. PR rejection conditions

A PR may be rejected immediately if it:
- edits outside permitted scope;
- touches protected backend/security areas without permission;
- adds unapproved dependencies;
- invents requirements/business states;
- duplicates shared UI/contracts;
- includes unrelated refactors;
- disables type/lint/test controls;
- contains secrets/real data;
- breaks responsive baseline;
- lacks required evidence;
- contains merge-conflict/generated junk;
- has incomplete PR body;
- lacks issue link;
- has inaccurate contribution attribution.

## 21. Mandatory issue structure

Every implementation issue defines:
```text
Title
Owner
Priority
Milestone
Dependencies

Goal
Permitted paths
Do-not-modify paths
Required functionality
Requirement/decision references
Contracts to consume
Design requirements
Responsive requirements
Accessibility requirements
Validation required
Evidence required
Acceptance criteria
Explicitly out of scope
PR rules
```

No issue should require the assignee to invent architecture.

## 22. Visual PR evidence

Unless the issue says otherwise:
- 375 px screenshot;
- 768 px screenshot;
- 1440 px screenshot;
- at least one relevant loading/empty/error/processing state;
- keyboard check;
- lint/type/build result;
- issue-required tests.

## 23. Priority model

### P0 — milestone/demo critical
Scaffold, database, auth, catalogue, product detail, cart, checkout, Stripe, order, inventory, core customer UI, integration/testing.

### P1 — high-value differentiator
Quiz/recommendations, admin dashboard, tracking, selected admin catalogue/inventory.

### P2 — safe-to-delegate
Profile UI, wishlist UI, reviews UI, loyalty/referral UI, secondary admin polish and other non-critical surfaces.

P2 never delays P0.

## 24. Week 8/9 checkpoints

First checkpoint:
**Login → Catalogue → Product Detail → Cart**

Second checkpoint:
**Cart → Checkout → Stripe Sandbox → Order → Inventory → Shipment/Tracking**

Differentiator only after core stability:
**Structured Quiz → AI Recommendation**

Then milestone feature freeze:
- integration;
- defects;
- responsive QA;
- accessibility;
- tests;
- seeded demo state;
- evidence;
- presentation readiness.

## 25. Definition of Done

Complete only when:
- acceptance criteria satisfied;
- scope respected;
- canonical contracts reused;
- design system followed;
- no unapproved dependency/architecture changes;
- required states implemented;
- responsive verified;
- accessibility verified;
- relevant tests pass;
- lint passes;
- type-check passes;
- production build passes;
- no secrets/real data;
- evidence attached;
- PR body complete;
- issue linked;
- conversations resolved;
- approved for integration.

“Works on my machine” is not Definition of Done.
