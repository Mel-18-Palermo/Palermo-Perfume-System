# System Development Methodology

## Purpose

The Palermo Perfume System uses an iterative Agile development approach supported by GitHub-based planning, version control, pull-request review and frequent validation against the approved Software Requirements Specification.

This is a pragmatic capstone methodology. It does not claim the team is operating a full formal Scrum framework or performing ceremonies that have not actually been used.

## Methodology selection

An iterative Agile approach is appropriate because Palermo contains multiple related domains—customer accounts, catalogue and discovery, personalisation, commerce, inventory, delivery, AI support, administration and promotional functions—that can be designed, implemented and verified incrementally.

The approach allows the team to:

- confirm requirements before implementation;
- divide work into bounded, reviewable units;
- validate technical decisions early;
- expose integration and scope risks before the final demonstration;
- incorporate supervisor/client feedback through controlled changes;
- maintain traceability from requirement to implementation and test evidence.

The project therefore combines iterative delivery with strict change control after the SRS baseline is frozen.

## Project lifecycle

### 1. Requirements and SRS baseline

Before application implementation begins, the team:

- analyses the supplied Palermo requirements;
- assigns canonical functional and non-functional requirement identifiers;
- records assumptions and unresolved/derived scope explicitly;
- defines actors, use cases, architecture, data model, privacy impacts and testability criteria;
- documents important technical and business decisions;
- reviews the Final SRS for internal consistency.

The SRS v1.0 baseline becomes the implementation reference once reviewed and frozen.

New business functionality after that point requires a documented change decision. Defect correction and implementation detail may evolve without being treated as new business scope when approved behaviour remains unchanged.

### 2. Increment planning

Implementation is organised into dependency-ordered increments rather than attempting the entire system simultaneously.

The approved implementation sequence is:

1. foundation, authentication and core data;
2. catalogue and product administration;
3. discovery, profile and fragrance experience;
4. cart, checkout, order, payment and inventory transaction core;
5. delivery and tracking;
6. AI recommendation and support;
7. administrator operations and reporting;
8. derived participation/promotion features;
9. hardening, NFR validation and demonstration readiness.

Each increment should produce a coherent, testable result and preserve the approved architecture.

### 3. Issue-based work definition

Work begins from a GitHub issue.

An implementation/documentation issue should identify:

- objective;
- relevant requirement/use-case IDs where applicable;
- required behaviour or artefact;
- constraints and exclusions;
- acceptance criteria;
- expected files or subsystem;
- dependencies/blockers where known.

Large work is split into smaller issues when independent review is practical.

This keeps individual contributions and project decisions visible in repository history.

### 4. Branch and implementation

Each issue is completed on a short-lived scoped branch created from the current `main`.

The project does not use a shared `develop` branch.

Implementation work should:

- stay within the issue scope;
- follow the approved modular-monolith boundaries;
- preserve server-authoritative security/business rules;
- add or update relevant automated tests;
- avoid unrelated refactoring unless required for the scoped change;
- avoid committing secrets, real personal data or raw payment-card data.

### 5. Pull-request review

Completed work is submitted through a pull request to `main`.

PR review checks, as applicable:

- requirement/scope consistency;
- architecture and domain boundaries;
- data-model impact;
- authentication, authorisation and ownership controls;
- transaction safety and concurrency;
- privacy/AI context minimisation;
- external-provider boundary compliance;
- test coverage;
- documentation accuracy;
- file placement and repository hygiene.

Review feedback is resolved before merge.

A PR may be accepted only when it is sufficiently complete for the approved increment; partial or contradictory work is returned for refinement.

### 6. Integration

`main` is the protected integration branch.

The approved workflow is:

Issue -> Branch -> Commit -> Pull Request -> Review -> Rebase Merge -> Delete Branch

Direct pushes and force pushes to protected branches are not part of the normal workflow.

Rebase merging keeps the integration history linear while preserving contribution through PR/commit metadata.

### 7. Verification

Testing occurs throughout development rather than only at the end.

Depending on the change, verification includes:

- unit tests for deterministic domain rules;
- integration tests for persistence, transactions and provider adapters;
- end-to-end tests for major user journeys;
- negative-path tests for RBAC, ownership, validation, retries and failures;
- manual/UI checks where visual, usability or accessibility assessment is required;
- non-functional validation under the documented staging profile.

Critical commerce/security rules receive explicit negative and retry/concurrency coverage.

### 8. Review and feedback cycle

Progress is reviewed iteratively against:

- current SRS scope;
- completed/blocked GitHub issues;
- open pull requests;
- test evidence;
- supervisor/client feedback;
- known risks and dependencies.

Feedback that changes business behaviour is recorded and assessed before implementation. Feedback that corrects defects or improves implementation detail may be incorporated through the relevant issue/PR.

This allows the system to adapt without silently changing the approved scope.

### 9. Final stabilisation

Before the final demonstration, development moves from feature delivery to stabilisation.

Activities include:

- scope freeze;
- regression testing;
- security/RBAC checks;
- transaction/idempotency/concurrency validation;
- accessibility/responsive/browser checks;
- performance and NFR evidence collection;
- backup/restore and recovery checks where required;
- traceability completion;
- defect triage;
- repeatable seed/demo reset;
- final known-limitations review.

## Work prioritisation

Work is prioritised by:

1. dependency;
2. security/data integrity risk;
3. critical customer journey impact;
4. external integration risk;
5. assessment/client demonstration value;
6. lower-risk supporting features.

This means authentication, authoritative data, checkout/payment and inventory integrity are completed before optional/derived enhancements.

## Definition of ready

An issue is ready for implementation when:

- the relevant requirement or approved decision exists;
- required dependencies are sufficiently resolved;
- expected behaviour and acceptance criteria are understandable;
- the work does not introduce unapproved scope.

If a required business rule is genuinely unresolved, it should be clarified before coding rather than guessed.

## Definition of done

A scoped implementation item is considered done when, as applicable:

- acceptance criteria are satisfied;
- relevant tests pass;
- validation/security/ownership rules are enforced;
- documentation and traceability are updated;
- no secrets or prohibited data are introduced;
- PR feedback is resolved;
- the pull request is merged into `main`.

A merged PR does not automatically mean the entire Final SRS requirement has passed system acceptance testing; final evidence is recorded separately.

## Risk control

The methodology reduces project risk through:

- SRS-first scope definition;
- small scoped branches;
- peer/technical PR review;
- protected `main`;
- provider abstraction and sandbox integrations;
- database constraints/transactions;
- automated and negative-path testing;
- explicit decision records;
- controlled change after baseline freeze;
- repeatable seeded demo data.

## Traceability

The target traceability chain is:

Requirement -> Use Case -> Design/Data/UI -> GitHub Issue -> Pull Request -> Test -> Result

This provides evidence of how an approved requirement progresses from specification into implementation and verification.

## Methodology summary

Palermo uses an iterative Agile, GitHub-driven development process with controlled increments, continuous review/testing and SRS-based scope control.

The methodology is deliberately lightweight enough for a capstone team while retaining the software-engineering controls required for a system containing payment, personal data, inventory concurrency, RBAC and external AI integrations.
