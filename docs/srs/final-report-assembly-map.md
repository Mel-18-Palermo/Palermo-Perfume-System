# Final SRS Report Assembly Map

## Purpose

This document maps the exact required Final SRS structure to the canonical Palermo repository evidence.

It is an internal handoff/index for the report editor.

It is not a substitute for independently authoring the assessed report.

## Exact report structure and source map

| Final SRS section | Canonical source / figure | Assembly instruction | Readiness rule |
|---|---|---|---|
| 1 Introduction | `docs/srs/introduction-scope-assumptions.md` | Rewrite/condense 1.1–1.5 while preserving the approved scope, limitations and assumptions. | READY |
| 1.1 Background Of study | same as above | Preserve client problem framing; do not add unsupported market claims. | READY |
| 1.2 Purpose of project | same as above | Preserve customer + administrator purpose. | READY |
| 1.3 Objectives of the Project | same as above | Objectives are planned system objectives, not completion claims. | READY |
| 1.4 Project scope and Limitations | same as above + FR/DER registries | Preserve 16 modules, exclusions and source-vs-derived distinction. | READY |
| 1.5 Project Assumptions | same as above | Do not freeze providers/hosting/auth choices still open. | READY |
| 2 Project of Deliverables | `docs/project-management/project-deliverables.md`; `docs/project-management/wbs-gantt.md`; `docs/project-management/wbs-gantt.csv` | Summarise deliverables; include WBS/Gantt evidence because rubric requires it. | READY AFTER MERGE |
| 3 System Requirements | `docs/requirements/functional-requirements.md`; `docs/requirements/derived-requirements.md`; `docs/requirements/non-functional-requirements.md`; `docs/requirements/traceability-matrix.csv` | Keep source FR, DER and NFR provenance distinct. | READY |
| 3.1 Functional Requirements | source FR + DER registries | Report must not claim DER requirements were numbered client FRs. Mention source #78 duplication accurately. | READY |
| 3.2 Non-Functional Requirements | NFR registry + testing NFR profile | Preserve source NFR wording and project-defined measurable criteria distinction. | READY |
| 4 System Architecture | `docs/diagrams/system-architecture.mmd` | Insert the approved architecture figure and concise explanation only. | READY |
| 4.1 Software and Hardware Architecture | same + `docs/srs/development-environment.md` | Diagram plus short boundary explanation. Do not imply microservices. | READY |
| 5 System Design | UI specs + class diagram + data design sources | Keep this section design-focused. | PARTIAL UNTIL ALL REPORT FIGURES MERGED |
| 5.1 User interface Design | `docs/ui/final-srs-ui-evidence-map.md` + existing `docs/ui/*.md` | Select report-facing wireframes/storyboards/forms/output/layout evidence. Do not call design artefacts implemented screenshots. | READY AS EVIDENCE PLAN |
| 6 Use Case Diagram | `docs/diagrams/report/use-case-diagram.svg` | Insert only the reviewed manual report SVG. | PENDING UNTIL PATH EXISTS ON MAIN |
| 7 Context Diagram (DFD level 0) | `docs/diagrams/report/dfd-level-0.svg` | Insert reviewed Gane & Sarson context diagram. | PENDING UNTIL PATH EXISTS ON MAIN |
| 8 Dataflow Diagrams | report DFD files | Short explanation of decomposition and boundaries. | PARTIAL |
| 8.1 DFD level 1 | `docs/diagrams/report/dfd-level-1.svg` | Verify exact process/store labels and Level 1 flows before insertion. | PENDING UNTIL REVIEWED/MERGED |
| 8.2 DFD level 2 | `docs/diagrams/report/dfd-level-2-commerce.svg` | Insert commerce Process 4.0 decomposition only. | PENDING UNTIL REVIEWED/MERGED |
| 9 Sequence Diagram | `docs/diagrams/report/sequence-checkout-payment.svg` | Insert reviewed checkout/payment sequence. | PENDING UNTIL REVIEWED/MERGED |
| 10 Entity relationship diagram | `docs/diagrams/report/erd-core-report.svg`; `docs/requirements/erd-logical-detailed.mmd` | Put concise core ERD in main report; detailed logical ERD may support appendix. | PENDING CORE REPORT ERD |
| 11 Data Dictionary | `docs/requirements/data-dictionary.csv` | Condense main report to readable representative/required table; full dictionary may be appendix. | READY |
| 12 Data Protection Impact Assessment | `docs/privacy/dpia.md`; `docs/privacy/retention-schedule.csv`; privacy risk register | Summarise processing, risks, controls and retention. | READY |
| 13 System development Methodology | `docs/project-management/system-development-methodology.md`; `docs/srs/development-environment.md` | Include development environment/file-folder structure here without creating a new numbered report section. | READY |
| 14 System Testing and implementation plan | `docs/testing/system-testing-plan.md`; `docs/project-management/implementation-plan.md` | Present planned verification/implementation only; no fake PASS evidence. | READY |
| 15 Responses on feedback from project supervisor | `docs/srs/supervisor-feedback-response-ledger.md` | Populate only from actual supervisor feedback and evidence. | WAITING FOR ACTUAL FEEDBACK |
| 16 Appendix | `docs/srs/appendix-evidence-index.md` | Include supporting detail that is too large for main report. | READY AS INDEX |

## Rubric items that do not have their own numbered heading

The required report structure must remain unchanged.

The following rubric evidence should therefore be placed inside existing sections rather than adding new numbered sections.

### Class diagram

Use:

`docs/diagrams/report/class-diagram.svg`

Place the class diagram as a figure within Section 5 System Design after the UI-design discussion.

Do not add a new numbered section if the required report structure must remain exact.

### Software development environment and folder structure

Use:

`docs/srs/development-environment.md`

Place a concise development-environment/file-structure summary inside Section 13 System development Methodology.

### WBS and Gantt

Use:

- `docs/project-management/wbs-gantt.md`
- `docs/project-management/wbs-gantt.csv`

Place concise WBS/Gantt evidence inside Section 2 Project Deliverables and move oversized supporting tables to Appendix if necessary.

### Storyboards, forms, input/output and page layouts

Use:

`docs/ui/final-srs-ui-evidence-map.md`

Place this evidence inside Section 5.1 User interface Design.

## Canonical technical statements that must remain consistent

- Architecture: Next.js + TypeScript modular monolith.
- Persistence: Prisma + Supabase PostgreSQL.
- Payment: Stripe sandbox/test boundary; no raw PAN/CVV storage.
- Delivery: one baseline shipment/order and internal delivery simulator.
- Checkout: no guest checkout.
- AI: bounded/advisory; Palermo-owned authoritative data remains authoritative.
- Inventory: variant-level, transaction/concurrency controlled.
- Reviews/community: public reviews only as baseline community capability.
- Subscription: opt-in/out only; no recurring billing.
- Social content: no automatic posting/scheduling baseline.
- Fragrance sensitivity: non-medical.
- Weather suggestions: deterministic approved category mapping; no live weather provider required.
- Source requirements: 91 listed source FR entries because #78 is duplicated.
- Four under-specified named modules: handled through separately identified `DER-*` requirements.
- Testing: planned until actual execution evidence exists.

## Stale wording prohibited in the final report

Do not reintroduce:

- standalone React frontend + standalone Node.js backend;
- Vercel/Render as fixed approved deployment;
- rule-based-only recommendations with AI excluded;
- production courier integration as the baseline;
- guest checkout;
- Customer cart persistence guarantee unless separately approved;
- refund/exchange/return-authorisation workflow;
- recurring subscription billing;
- social-network/community-feed functionality;
- split shipment or multi-warehouse fulfilment;
- raw payment-card data storage;
- medical interpretation of fragrance sensitivity;
- AI as the authoritative source for price/stock/order/payment/policy/delivery facts;
- "tests passed" without execution evidence.

## Report-editor handoff

The report editor can begin assembly immediately from READY sources while using placeholders for PENDING report diagrams.

Do not wait for every diagram to finish before building the document structure, citations, section summaries, tables and appendix.

When a pending diagram PR is approved, replace the placeholder with the reviewed `docs/diagrams/report/*.svg` artefact.
