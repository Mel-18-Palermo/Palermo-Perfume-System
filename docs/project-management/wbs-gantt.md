# Work Breakdown Structure and Gantt Plan

## Purpose

This document provides the project-level Work Breakdown Structure (WBS) and week-based Gantt plan for the Palermo Perfume System.

It is a planning baseline, not a claim that all work has been completed on the dates shown.

The official CPRO306 assessment briefs identify the Final SRS as a Week 5 submission, Mid Project Deliverables as Week 9, and End of Project Deliverables as Week 11. The detailed work allocation within those weeks is the Palermo team's project plan.

## Planning assumptions

- Weeks are used rather than invented calendar dates.
- SRS v1.0 is frozen before application implementation begins.
- `main` is the integration branch; implementation proceeds through scoped GitHub issues/branches/PRs.
- Work may overlap where dependencies permit.
- High-risk foundation, security, payment and inventory work is prioritised before optional/derived capability.
- Exact individual contribution is evidenced through GitHub issues/commits/PRs and is not replaced by this schedule.
- The plan may be revised where supervisor feedback or technical blockers require a documented change.

## WBS

| WBS ID | Work package | Main outputs | Dependency | Planned weeks |
|---|---|---|---|---|
| 1.0 | Project initiation and planning | Team/project setup, scope, roles, preliminary deliverables, risks, communication | None | W1 |
| 1.1 | Requirements elicitation | Client/source requirements reviewed, actors and scope identified | 1.0 | W1-W2 |
| 1.2 | Interim planning artefacts | Interim SRS/project planning, initial WBS/Gantt, feasibility/risk material | 1.0-1.1 | W2 |
| 2.0 | Final SRS baseline | Canonical FR/NFR registries, assumptions, decisions, detailed SRS content | 1.1 | W2-W5 |
| 2.1 | Use cases and UI design | Use cases, UI specifications/storyboards/input/output layouts | 2.0 | W3-W5 |
| 2.2 | Architecture and DFD/UML design | Architecture, Use Case, DFD 0/1/2, Sequence, Class design | 2.0 | W3-W5 |
| 2.3 | Data design and DPIA | ERD, data dictionary, privacy/retention/risk/DPIA | 2.0 | W3-W5 |
| 2.4 | Testing/implementation planning | Test plan, implementation plan, methodology/environment | 2.0-2.3 | W4-W5 |
| 2.5 | Final SRS review/freeze | Consistency audit, supervisor feedback response, report assembly | 2.1-2.4 | W5 |
| 3.0 | Application foundation | Next.js/TS scaffold, Prisma/Supabase, config, seed, CI | 2.5 | W6 |
| 3.1 | Authentication/account/RBAC | Customer lifecycle, profile/address, admin auth/RBAC | 3.0 | W6 |
| 3.2 | Catalogue/data administration | Perfume/family/note/variant model and admin catalogue functions | 3.0 | W6-W7 |
| 4.0 | Discovery/personalisation | Search/filter, fragrance experience, profile/identity, quiz | 3.1-3.2 | W7 |
| 4.1 | AI recommendation boundary | Approved recommendation context, provider adapter, failure isolation | 4.0 | W7-W8 |
| 5.0 | Cart/wishlist | Visitor/customer cart, wishlist, customisations, promotions | 3.1-3.2 | W7 |
| 5.1 | Checkout/order/payment core | Revalidation, reservations, order snapshots, Stripe sandbox, invoice/idempotency | 5.0 | W7-W8 |
| 5.2 | Inventory/production | Balance, reservations, movement ledger, production batch, concurrency controls | 3.2, 5.1 | W7-W8 |
| 6.0 | Delivery/tracking | Delivery method, internal simulator, shipment/tracking | 5.1 | W8 |
| 6.1 | Support/AI assistance | Public support, authenticated support, approved server-side tools | 3.1, 4.1, 5.1 | W8 |
| 6.2 | Admin/reporting | Dashboard, reporting, moderation, audit/backup surfaces | 3.1-6.1 | W8-W9 |
| 6.3 | Derived participation/promotions | Review, loyalty, subscription, referral, promo content/AI generation | 5.1, 6.2 | W8-W9 |
| 7.0 | Mid-project integration review | Integrated build review, iteration evidence, design/implementation update | 3.0-6.3 | W9 |
| 8.0 | Hardening and regression | Defect fixing, security/RBAC, transaction/concurrency regression | 7.0 | W9-W10 |
| 8.1 | NFR validation | Performance, accessibility, responsiveness, browser, availability/recovery evidence | 7.0 | W10 |
| 8.2 | Deployment/user documentation | Setup, seed/reset, operation, user/admin/help documentation | 7.0 | W10 |
| 8.3 | Traceability and evidence | Requirement->PR->test/result completion, known limitations | 7.0-8.2 | W10-W11 |
| 9.0 | Final project integration | Final known-good build, final regression, demo reset | 8.0-8.3 | W11 |
| 9.1 | Final report/handover | End-project report, evidence, presentation/demo package | 9.0 | W11 |

## Gantt view

Legend:

- `██` planned active work
- `◆` assessment/project milestone
- blank = not planned as the primary execution period

| Work package | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Initiation/planning | ██ | | | | | | | | | | |
| Requirements/interim planning | ██ | ██ | | | | | | | | | |
| Final SRS baseline | | ██ | ██ | ██ | ██ | | | | | | |
| UI/use-case/system design | | | ██ | ██ | ██ | | | | | | |
| Data design/DPIA | | | ██ | ██ | ██ | | | | | | |
| Test/implementation/methodology planning | | | | ██ | ██ | | | | | | |
| **Final SRS submission/freeze** | | | | | ◆ | | | | | | |
| Foundation/auth/data | | | | | | ██ | ██ | | | | |
| Catalogue/discovery/profile | | | | | | ██ | ██ | ██ | | | |
| Cart/order/payment/inventory | | | | | | | ██ | ██ | | | |
| Delivery/AI/support/admin/derived | | | | | | | | ██ | ██ | | |
| **Mid Project Deliverables** | | | | | | | | | ◆ | | |
| Hardening/regression/NFR validation | | | | | | | | | ██ | ██ | |
| Deployment/user docs/traceability | | | | | | | | | | ██ | ██ |
| Final integration/demo readiness | | | | | | | | | | ██ | ██ |
| **End of Project Deliverables** | | | | | | | | | | | ◆ |

## Major milestones

### M1 — Project initiated

**Target:** Week 1

Evidence:

- project/team established;
- preliminary scope and roles;
- initial project-management artefacts.

### M2 — Requirements/planning baseline available

**Target:** Week 2

Evidence:

- initial requirements analysis;
- interim planning;
- preliminary WBS/Gantt/risk/feasibility material.

### M3 — Final SRS v1.0 submission and freeze

**Target:** Week 5

Evidence:

- reviewed SRS source;
- required report/design diagrams;
- test/implementation plans;
- development methodology/environment;
- DPIA/data model;
- supervisor feedback response;
- WBS/Gantt.

Implementation begins only after this baseline is accepted/frozen for development.

### M4 — Foundation and first coherent vertical slices

**Target:** Week 6-7

Evidence:

- application scaffold;
- data connectivity/migrations/seed;
- authentication/profile foundation;
- catalogue/discovery foundation;
- automated quality checks.

### M5 — Core commerce integration

**Target:** Week 8

Evidence:

- cart;
- checkout;
- Stripe sandbox;
- order/payment snapshots;
- inventory reservation/commit;
- delivery simulator integration;
- critical transaction tests.

### M6 — Mid Project Deliverables

**Target:** Week 9

Evidence focus:

- implementation progress;
- repository/iteration evidence;
- database and UI implementation evidence;
- integration progress;
- updated project management/team progress.

### M7 — System hardening complete

**Target:** Week 10

Evidence:

- regression/security/RBAC tests;
- NFR validation runs;
- accessibility/responsive/browser checks;
- documentation and traceability nearing completion;
- major defects triaged/resolved.

### M8 — End of Project Deliverables / final handover

**Target:** Week 11

Evidence:

- integrated final build;
- test results;
- implementation/integration evidence;
- operation/user documentation;
- known limitations;
- final report and demonstration/handover package.

## Dependency summary

The critical implementation dependency path is:

SRS freeze
-> application/data/auth foundation
-> catalogue + customer ownership
-> cart
-> checkout/payment + inventory
-> delivery
-> integrated system testing
-> final build/demo

AI, reporting and derived features can progress in parallel where their authoritative data/service dependencies already exist, but they cannot bypass the critical commerce/security foundation.

## Schedule control

Progress should be assessed using repository evidence:

- open/closed GitHub issues;
- PR state and review outcomes;
- merged commits;
- blocked dependencies;
- linked test results;
- milestone readiness.

At the end of an iteration/week, planned work should be classified as:

- completed;
- carried forward;
- blocked;
- descoped through an approved change.

Any material change to frozen business scope should be recorded separately rather than silently altering this schedule.

## Important interpretation

The official course briefs define assessment submission weeks, but the internal week-by-week engineering allocation above is a Palermo project planning decision.

The Gantt plan should therefore be updated if actual supervisor-approved timing or implementation dependencies change.
