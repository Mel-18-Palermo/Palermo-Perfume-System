# Palermo Project Documentation

This directory contains the canonical technical and project documentation for the Palermo Perfume System.

## Source format

- Documentation must be written in Markdown.
- System diagrams must use Mermaid as their canonical source format.
- Generated Word, PDF, PNG, or SVG files are submission/export artefacts, not the editable source of truth.

## Structure

| Directory | Purpose |
|---|---|
| `requirements/` | Functional requirements, non-functional requirements, open questions, and traceability |
| `srs/` | Source material organised around the Final SRS structure |
| `diagrams/` | Mermaid use-case, DFD, sequence, architecture, and ER diagrams |
| `ui/` | User-interface design requirements and supporting design material |
| `security/` | DPIA, privacy, security, RBAC, and related design decisions |
| `testing/` | Test strategy, test cases, UAT, defects, and results |
| `project-management/` | Planning, meetings, supervisor feedback, risks, and contribution evidence |

## Change control

Documentation changes follow the same workflow as application code:

Issue → branch → commit → pull request → review → merge.

Requirements must use their canonical IDs in related diagrams, issues, tests, and implementation work.
