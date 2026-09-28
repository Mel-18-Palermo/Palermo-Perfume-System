# Palermo documentation

This directory contains both current operating documentation and dated project evidence. Read the category before treating a statement as current system behaviour.

## Current operational documentation

| Location | Use |
| --- | --- |
| [`../README.md`](../README.md) | current system overview, deployment model and local setup |
| [`../prisma/README.md`](../prisma/README.md) | schema isolation, migration workflow and synthetic-data tooling |
| [`development/implementation-handbook.md`](development/implementation-handbook.md) | architecture, boundaries, delivery and deployment rules |
| [`development/frontend-contracts.md`](development/frontend-contracts.md) | client/server contract and browser trust rules |
| [`development/demo-history.md`](development/demo-history.md) | controlled-production synthetic-history operation |
| [`../SECURITY.md`](../SECURITY.md) | security reporting and current implementation boundaries |
| [`testing/README.md`](testing/README.md) | test commands, plans and evidence |
| [`ui/README.md`](ui/README.md) | UI implementation and design references |

## Requirements and SRS material

- [`requirements/`](requirements/) — canonical requirements, decision records, data dictionary, traceability and logical ERD.
- [`srs/`](srs/) — final SRS source, use cases and report assembly material.
- [`diagrams/`](diagrams/) — Mermaid and editable/exported report diagram sources.

Requirements and SRS documents are authoritative for their approved baseline, but may describe planned scope or a frozen point in time rather than the deployed state. Use the root README and current operational guides for present-tense deployment claims.

## Security and privacy

- [`security/`](security/) — supporting security evidence, including dated regression material.
- [`privacy/`](privacy/) — DPIA, retention schedule and risk register.

## Testing and UI evidence

- [`testing/`](testing/) — current test navigation plus plans, regression maps and QA evidence. Dated evidence records the state and method at the time it was produced.
- [`ui/`](ui/) — design system, UI specifications and final-report/UI evidence. Some documents are frozen design or remediation records.

## Catalogue provenance

[`catalogue/source-provenance.md`](catalogue/source-provenance.md) records the provenance of approved locally stored catalogue imagery.

## Project-management and delivery evidence

[`project-management/`](project-management/) contains methodology, WBS/Gantt, implementation plans, deliverables, feedback records and other historical delivery evidence. Preserve its dated truth; it is not a live release-status dashboard.

## Change control

Documentation changes follow the repository workflow: issue, branch, focused pull request, review and merge. Keep current operation guides accurate; do not rewrite historical artefacts simply because later work has changed the system.
