# Palermo Perfume System — Implementation Ownership Map

Status: **Implementation ownership baseline**

This document defines technical ownership and contribution boundaries to reduce merge conflicts, architectural drift and milestone risk.

## 1. Backend/platform/integration — HexCodeYT

Owns:
- server architecture;
- Prisma/schema/migrations;
- Supabase PostgreSQL;
- auth/session;
- RBAC;
- shared DTO/API contracts;
- validation;
- catalogue server logic;
- cart;
- checkout;
- Stripe;
- order/payment lifecycle;
- inventory transactions;
- delivery simulator;
- AI/email adapters;
- security/privacy controls;
- CI/deployment technical config;
- seed/demo reset;
- cross-module integration.

Protected:
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

No contributor modifies these unless their issue explicitly permits it.


### Deployment authority

Contributors may trigger automated Vercel Preview Deployments through normal branch/PR pushes. This does not grant manual deployment privileges.

Manual deployment/project control is restricted to **HexCodeYT** and approved CI/CD automation, including:

- production deployments;
- manual redeploys;
- rollbacks;
- environment-variable changes;
- Vercel project configuration;
- domain configuration;
- production/demo environment connections.

No contributor should run manual Vercel production commands or receive production secrets as part of ordinary feature work.

Preview deployments must use test/preview configuration and synthetic data rather than the production database.

---

## 2. Customer presentation-critical UI — k250026-Neil

Primary:
- catalogue/browse;
- search/filter presentation;
- perfume cards/detail;
- fragrance presentation;
- comparison presentation where scheduled;
- quiz/recommendation UI;
- cart UI;
- checkout UI;
- order-success presentation;
- integration with approved client contracts.

Does not own:
- Prisma/database;
- auth/session;
- Stripe;
- checkout authority;
- order/payment state;
- inventory transactions;
- AI provider calls;
- contract redesign.

Must be able to work against deterministic mocks before backend endpoints are ready.

## 3. Admin application UI — k250123 / Asel

Primary:
- admin shell/navigation;
- dashboard;
- catalogue management UI;
- perfume create/edit/archive forms;
- variant/inventory UI;
- promotions UI;
- review moderation UI;
- approved reporting cards/tables/charts.

Does not own:
- RBAC design;
- session authority;
- schema;
- inventory semantics;
- catalogue business rules;
- reporting definitions;
- audit semantics;
- provider integrations.

## 4. Safe-to-delegate lanes

### K240432 — Account/Profile UI
Candidate scope:
- account overview;
- profile form;
- current delivery/billing addresses;
- fragrance preferences;
- favourite notes;
- preferred intensity;
- optional sensitivity presentation;
- deactivation confirmation UI.

Never assign auth internals, session logic, deactivation semantics or schema work.

### k240268-design — Wishlist / Reviews / Loyalty UI
Candidate scope:
- wishlist page/states;
- review form/list;
- loyalty summary;
- referral-code presentation;
- loading/empty/error states.

Never assign purchase-eligibility logic, moderation authority, loyalty/referral calculation or schema work.

### k231371-dotcom — Orders / Tracking UI + bounded QA
Candidate scope:
- order history;
- order detail;
- tracking timeline;
- delivery-status component;
- responsive/accessibility cleanup within owned paths.

Never assign order/payment state transitions, shipment simulator/provider logic or schema work.

## 5. Presentation-critical path

```text
Register/Login
→ Catalogue
→ Product Detail
→ Cart
→ Checkout
→ Stripe Sandbox
→ Order Confirmation
→ Tracking
```

Backend authority: **HexCodeYT**

Primary customer UI: **k250026-Neil**

Secondary presentation surface:
```text
Admin Login
→ Dashboard
→ Catalogue / Inventory
```

Backend authority: **HexCodeYT**

Admin UI: **k250123 / Asel**

The other three contributors must not become hard dependencies of the P0 path unless explicitly approved.

## 6. AI differentiator

Target:
```text
Structured fragrance quiz
→ approved server context
→ AI recommendation adapter
→ recommendation result
```

Backend/provider boundary: **HexCodeYT**

Quiz/recommendation UI: **k250026-Neil**

No direct AI SDK/API calls by other contributors.

## 7. File ownership

Every issue states permitted paths.

Example:
```text
Permitted:
src/modules/catalogue/ui/**
src/app/(store)/perfumes/**

Do not modify:
prisma/**
src/contracts/**
src/integrations/**
src/lib/**
src/components/ui/**
```

Out-of-scope file changes require explanation/approval.

## 8. Shared components

`src/components/ui/**` is shared infrastructure.

Feature owners consume primitives and must not:
- fork shared primitives;
- silently change a primitive for one page;
- create alternate colour/spacing systems;
- replace icon/component approaches.

Needed primitive change → dependency/request.

## 9. Contract ownership

`src/contracts/**` is backend/platform-owner controlled.

Frontend may:
- import types;
- consume approved client;
- use matching fixtures.

Frontend may not:
- rename server statuses;
- create competing DTOs;
- add mock-only fields;
- infer backend enums from labels;
- change API semantics independently.

## 10. Escalation

Stop and ask if:
- a field is missing from contract;
- schema change appears needed;
- business state is ambiguous;
- new dependency is desired;
- new shared primitive is needed;
- endpoint behaviour is unavailable;
- protected paths must be touched;
- canonical requirement/decision conflicts;
- P0 flow would change.

Do not “just make it work” across ownership boundaries.

## 11. Mock-first parallel development

```text
UI component
→ Palermo client contract
→ mock adapter OR real adapter
```

The technical owner supplies canonical types, fixtures and client interface so backend, customer UI, admin UI and safe-delegate UI progress in parallel.

## 12. Rescue policy

During Week 8/9:
- P0 blocker: reassign/rescue immediately;
- P1: cut if P0 unstable;
- P2: do not rescue at P0 expense.

Missed safe-delegate work may remain incomplete until after milestone.

## 13. Review expectations

Backend/platform PR:
- requirement/decision traceability;
- tests;
- transaction/idempotency review where relevant;
- security/privacy review;
- migration review where relevant;
- clear failure behaviour.

Customer/admin UI PR:
- contract compliance;
- no protected backend changes;
- loading/success/empty/error;
- 375/768/1440 evidence;
- keyboard/accessibility;
- design-system compliance;
- lint/type/build;
- no invented business behaviour.

## 14. Contribution attribution

Preserve actual authorship.
Do not:
- rewrite another contributor's work under your identity;
- commit another person's completed feature as your own;
- obscure contribution history.

Maintainer fixes remain attributable to the maintainer while original contributor history stays intact.

## 15. Milestone ownership summary

| Area | Owner | Criticality |
|---|---|---|
| Scaffold/tooling | HexCodeYT | P0 |
| Database/Prisma | HexCodeYT | P0 |
| Auth/session/RBAC | HexCodeYT | P0 |
| Catalogue backend | HexCodeYT | P0 |
| Customer catalogue/product UI | k250026-Neil | P0 |
| Cart/checkout backend | HexCodeYT | P0 |
| Cart/checkout UI | k250026-Neil | P0 |
| Stripe/order/inventory | HexCodeYT | P0 |
| AI recommendation backend | HexCodeYT | P1 |
| Quiz/recommendation UI | k250026-Neil | P1 |
| Admin UI | k250123 / Asel | P1 |
| Profile UI | K240432 | P2 |
| Wishlist/reviews/loyalty UI | k240268-design | P2 |
| Orders/tracking UI | k231371-dotcom | P1/P2 |
| Security/integration | HexCodeYT | P0 |
| Demo stabilisation | HexCodeYT + critical UI owners | P0 |
