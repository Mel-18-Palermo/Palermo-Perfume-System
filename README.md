# Palermo Perfume System

Palermo Perfume System is a client-facing capstone project for an intelligent online perfume selling platform.

The project is currently in the **Software Requirements Specification (SRS) phase**. Application implementation will begin only after SRS v1.0 is reviewed and frozen.

## Current phase

**SRS development**

The current priorities are:

- validate and normalise the Palermo functional requirements;
- define measurable non-functional requirements;
- establish project scope and assumptions;
- model system actors and use cases;
- design the software and data architecture;
- produce Mermaid-based system diagrams;
- prepare the data dictionary, DPIA, test plan, and implementation plan;
- maintain traceability between requirements, design, implementation, and testing.

No application scaffold should be introduced until the SRS baseline is approved.

## Planned technology stack

The current implementation baseline is:

- Next.js
- React
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Stripe sandbox for payment testing

Additional services, hosting, authentication, AI integrations, deployment tooling, and supporting libraries will be selected through reviewed technical decisions.

## Repository rules

`main` is the protected integration branch.

All changes must follow:

1. GitHub issue
2. Short-lived branch
3. Focused commits
4. Pull request
5. Review
6. Merge into `main`

Direct pushes to `main` are prohibited.

Force pushes to protected branches are prohibited.

There is no shared `develop` branch.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the required workflow.

## Documentation rules

Project documentation is maintained as Markdown.

Documentation: `.md`  
Diagrams: Mermaid

Mermaid source is the canonical form for system diagrams. Fixed image exports may be produced later for assessment submission or presentation purposes.

## Documentation structure

- `docs/requirements/` — Functional, non-functional, open questions, and traceability requirements
- `docs/srs/` — SRS section source material
- `docs/diagrams/` — Mermaid system diagrams
- `docs/ui/` — UI design specifications and supporting material
- `docs/security/` — Privacy and security design
- `docs/testing/` — Test strategy, cases, results, and evidence
- `docs/project-management/` — Meetings, supervisor feedback, planning, and contribution evidence

## Requirements baseline

The supplied Palermo project specification currently contains:

- 91 explicitly listed functional requirement entries due to a duplicated source requirement number;
- 33 non-functional requirement categories;
- four named modules that require additional requirements clarification.

Canonical requirement IDs are maintained in:

- `docs/requirements/functional-requirements.md`
- `docs/requirements/non-functional-requirements.md`
- `docs/requirements/open-questions.md`

These files are the requirements source of truth for the new project baseline.

## Implementation status

Application development has **not started** under the reset baseline.

The implementation phase begins after SRS v1.0 is frozen.
