# Issue responsibility map

This map is based on all 58 open issues inspected on 16 August 2026. The issues currently have empty
descriptions, so their titles, assignees, labels, and milestones define the available scope.

## Neil — requirements and use cases

Issues: #105, #108–#113.

Owns non-functional requirements, authentication/registration, scent profiling, search/filtering,
cart/checkout, order/invoice use cases, and the level-0 context diagram.

## Samarako(o)n — project management and report coordination

Issues: #94–#103.

Owns project context and scope, agile planning, WBS and schedule, lecturer feedback, stakeholder goals,
deployment strategy documentation, references, and final report compilation.

## Monalisa — UI/UX design

Issues: #114–#123.

Owns visual guidelines, six customer-flow wireframes/storyboards, form and client-validation rules,
invoice/report layouts, responsiveness, and mobile usability specifications.

## Gershon — database analysis and documentation

Issues: #134–#143.

Owns the conceptual data model, ERD/domain diagrams, data dictionaries, indexing and constraint
recommendations, recovery procedures, and database ethics. Executable schema and migration changes
must be reviewed by the backend/security lead before merge.

## Pawan — backend, security, integration, and repository governance

Issues: #144–#154 excluding the unused #153.

Owns requirements FR46–FR90, backend architecture, level-1 DFD, DPIA and privacy controls, encryption
architecture, RBAC, third-party integration specifications, web-security controls, repository setup,
branch protection, and CI/CD decisions. Payment and AI work remains sandboxed until providers are
approved; CD remains pending until hosting is known.

## Tarek — quality assurance and defect tracking

Issues: #124–#133.

Owns the master test plan, authentication, search/quiz, cart, payment, catalog, and chatbot test cases,
the integration/defect process, UAT checklist, and performance/load-test plan.

## Shared team responsibility

Issue #93 covers team communication and is currently unassigned. Meeting records, decisions, blockers,
and action owners should be maintained by the team in `docs/project-management/`.
