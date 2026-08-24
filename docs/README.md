# Palermo Project Documentation

This directory contains the canonical technical and project documentation for the Palermo Perfume System.

## Source and report artefact rules

- Written documentation is maintained in Markdown or structured text/CSV where appropriate.
- `docs/diagrams/system-architecture.mmd` is the final report architecture source.
- Final report diagrams that require manual page composition or exact notation may use editable draw.io source under `docs/diagrams/report-src/`.
- Final report diagram exports belong under `docs/diagrams/report/` as SVG.
- The detailed logical ERD is maintained under `requirements/` beside the data dictionary and data-model notes.
- Generated Word/PDF submission files do not replace the editable repository sources.

## Structure

| Directory | Purpose |
|---|---|
| `requirements/` | Functional/non-functional requirements, decision baseline, data dictionary and traceability |
| `srs/` | Final-SRS source material, use-case specifications and report-supporting sections |
| `diagrams/` | Final report diagrams plus technical/reference diagram sources |
| `ui/` | UI requirements, report UI evidence and wireframe/supporting design material |
| `privacy/` | DPIA, privacy risk register and retention schedule |
| `security/` | Security-specific supporting material not already covered by the DPIA/NFR baseline |
| `testing/` | Test strategy, system testing plan, acceptance criteria, evidence and results |
| `project-management/` | Methodology, implementation plan, deliverables, WBS/Gantt, supervisor feedback and project evidence |

## Change control

Documentation changes follow the same workflow as application code:

Issue → branch → commit → pull request → review → merge.

Requirements must use their canonical IDs in related diagrams, issues, tests and implementation work.
