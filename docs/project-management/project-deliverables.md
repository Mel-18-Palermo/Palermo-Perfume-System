# Project Deliverables

## Purpose

This document defines the Palermo Perfume System project deliverables used for project planning and Final SRS traceability.

The deliverables are grouped by project phase. A deliverable being listed here does not mean it has already been implemented or accepted; implementation/test deliverables remain future work until supporting repository and test evidence exists.

## 1. Software Requirements Specification baseline

### Deliverable

Final Software Requirements Specification (SRS) v1.0.

### Includes

- project background, purpose, objectives, scope, limitations and assumptions;
- project deliverables;
- functional requirements;
- non-functional requirements with measurable project acceptance criteria;
- system architecture;
- user-interface design evidence;
- system use-case diagram and detailed use-case specifications;
- Context DFD / Level 0;
- DFD Level 1;
- commerce DFD Level 2;
- checkout/payment sequence diagram;
- core report ERD;
- detailed logical data model and data dictionary;
- class diagram;
- Data Protection Impact Assessment;
- development methodology;
- system testing plan;
- implementation plan;
- development environment and proposed file/folder structure;
- WBS/Gantt planning evidence;
- supervisor-feedback response material;
- appendix/supporting technical evidence.

### Acceptance basis

- internally consistent with the approved Palermo scope;
- no unsupported business capability presented as client-supplied;
- clear distinction between source requirements and project-derived requirements;
- suitable as the frozen implementation baseline after review.

## 2. User-interface design package

### Deliverable

Responsive customer and administrator interface design package.

### Includes

- catalogue/discovery interfaces;
- perfume/product detail and virtual-fragrance presentation;
- profile/preferences/quiz/recommendation interfaces;
- cart, wishlist, checkout and order/tracking interfaces;
- customer support/AI assistance interfaces;
- administrator catalogue/inventory/promotion/review/reporting interfaces;
- required input forms, output/report views, layouts and storyboard/wireframe evidence.

### Acceptance basis

- covers the approved major user journeys;
- distinguishes public, authenticated customer and administrator surfaces;
- considers responsive behaviour and accessibility;
- includes AI transparency where AI output is shown.

## 3. Architecture and system-design package

### Deliverable

Approved technical system-design package.

### Includes

- modular-monolith system architecture;
- report-facing UML/DFD diagrams;
- logical domain/class design;
- provider boundaries for payment, email, AI and delivery;
- trust-boundary/security interpretation.

### Acceptance basis

- aligned with Next.js + TypeScript, Prisma and Supabase PostgreSQL;
- delivery simulator remains internal;
- Stripe, email and AI remain external-provider boundaries;
- no microservice architecture is implied.

## 4. Database and data-governance design

### Deliverable

Database/data design and privacy package.

### Includes

- detailed logical ERD;
- report-facing core ERD;
- canonical data dictionary;
- persistence constraints/invariants;
- retention schedule;
- privacy risk register;
- DPIA;
- data-minimisation and AI-context rules.

### Acceptance basis

- supports all approved/derived data needs;
- distinguishes current values from immutable order/payment snapshots;
- prevents raw card and medical/health data from entering the Palermo data model;
- documents retention and access boundaries.

## 5. Application foundation

### Deliverable

Working Palermo modular-monolith application foundation.

### Includes

- Next.js/React/TypeScript scaffold;
- environment/configuration validation;
- Prisma/Supabase connectivity;
- migrations and repeatable seed;
- authentication/session foundation;
- administrator RBAC foundation;
- shared validation, safe error handling and logging;
- CI quality checks.

### Acceptance basis

- repeatable setup in controlled development/test environment;
- protected operations remain server authoritative;
- no production secrets or real personal/payment data are required.

## 6. Customer account and profile capability

### Deliverable

Customer identity, account and profile functions.

### Includes

- registration;
- email verification;
- login/logout;
- password reset;
- activation/deactivation behaviour;
- customer profile;
- delivery/billing addresses;
- fragrance preference profile;
- deterministic fragrance identity.

### Acceptance basis

- verified ACTIVE customer required for authenticated functions;
- deactivated customer access is blocked;
- ownership/security tests pass.

## 7. Catalogue, discovery and fragrance-experience capability

### Deliverable

Customer-facing perfume discovery capability and administrator catalogue maintenance.

### Includes

- perfume/family/note/variant model;
- collections;
- controlled discovery filters;
- comparison;
- fragrance wheel;
- scent journey and suitability presentation;
- catalogue administration;
- product archive behaviour.

### Acceptance basis

- public catalogue/discovery is available to Visitor and Customer;
- server-authoritative active/sellable state is respected;
- supported filters match approved requirements.

## 8. Personalisation, quiz and recommendation capability

### Deliverable

Personalised fragrance discovery and recommendation capability.

### Includes

- structured quiz;
- profile/quiz recommendation context;
- rule-based deterministic profile/identity behaviour;
- AI-assisted recommendation presentation where approved;
- graceful AI failure.

### Acceptance basis

- Palermo-approved data remains authoritative;
- AI receives only approved/minimised context;
- recommendations cannot override commerce facts.

## 9. Cart, wishlist, order and payment capability

### Deliverable

End-to-end controlled purchase flow.

### Includes

- Visitor temporary cart;
- authenticated Customer cart;
- wishlist;
- product customisation selections;
- promotion validation;
- authenticated checkout;
- live price/stock revalidation;
- bounded inventory reservation;
- order snapshots;
- Stripe sandbox payment;
- payment verification;
- invoice generation;
- cancellation request where approved.

### Acceptance basis

- no guest checkout;
- raw PAN/CVV is not stored;
- duplicate/retry/provider-result processing produces one business outcome;
- failed/expired payment safely releases inventory reservation.

## 10. Inventory, production and fulfilment capability

### Deliverable

Variant-level inventory and simulated fulfilment.

### Includes

- inventory balance;
- reservation;
- inventory movement ledger;
- finished-perfume production batch;
- low-stock indication;
- delivery method snapshot;
- one baseline shipment per order;
- internal delivery simulator;
- customer tracking view.

### Acceptance basis

- concurrent checkout cannot allocate more stock than available;
- production-batch release affects inventory exactly once;
- delivery simulator is used for controlled capstone demonstration/testing.

## 11. Customer participation and support capability

### Deliverable

Bounded review, loyalty/referral and support functions.

### Includes

- verified-purchase review;
- public review/community baseline;
- loyalty points;
- subscription opt-in/out;
- referral code/outcome;
- generic public support;
- authenticated customer-specific support.

### Acceptance basis

- no unapproved social-network features;
- support access to account/order facts enforces authentication/ownership;
- AI failure cannot corrupt authoritative customer/order data.

## 12. Administrator operations and promotional capability

### Deliverable

Protected administrator management/reporting functions.

### Includes

- catalogue management;
- inventory/batch management;
- promotion management;
- review moderation;
- customer/admin management within approved permissions;
- reporting/dashboard;
- audit views;
- backup controls/status within the approved implementation baseline;
- promotional-content records;
- AI-assisted promotional generation with human review.

### Acceptance basis

- RBAC deny-by-default;
- high-impact actions audited;
- AI-generated promotion cannot be automatically treated as approved/published.

## 13. Testing and quality-evidence package

### Deliverable

System test evidence and quality summary.

### Includes

- unit tests;
- integration tests;
- end-to-end tests;
- negative-path/security tests;
- idempotency/concurrency tests;
- responsive/browser/accessibility checks;
- performance/scalability measurements;
- backup/restore and DR evidence where required;
- defect register;
- final test summary.

### Acceptance basis

- evidence links to the approved test plan and NFR criteria;
- planned tests are not marked as passed without execution evidence;
- final demo readiness criteria are assessed.

## 14. Deployment, operation and user documentation

### Deliverable

Documentation supporting repeatable setup, demonstration and use.

### Includes

- environment setup;
- required environment-variable names without secret values;
- database migration/seed/reset instructions;
- controlled test integration setup;
- customer/user guidance;
- administrator guidance;
- known limitations;
- support/help-desk information;
- deployment/rollback notes.

### Acceptance basis

- a reviewer can understand how the controlled application environment is prepared and operated;
- no secrets are embedded in documentation.

## 15. Final integrated project and demonstration

### Deliverable

Integrated Palermo capstone system and final project handover/demonstration package.

### Includes

- identified final commit/tag;
- application source;
- database schema/migrations;
- controlled seeded demo data;
- integrated approved features;
- final report/documentation package;
- test summary;
- known limitations;
- demonstration flow.

### Acceptance basis

- critical approved journeys can be demonstrated end-to-end;
- the build can be reset/reproduced using controlled data;
- project output remains within the frozen SRS baseline.

## Deliverable control

Deliverable status should be tracked through repository evidence rather than narrative claims.

Preferred evidence chain:

Requirement -> Use Case -> Design/Data/UI -> GitHub Issue -> Pull Request -> Test -> Result

GitHub issues and pull requests provide implementation/contribution evidence; final test results provide acceptance evidence.
