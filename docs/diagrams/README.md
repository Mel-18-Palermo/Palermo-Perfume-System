# Final SRS diagram workspace

This directory contains only the report-facing diagram workspace.

## Final report diagrams

1. `system-architecture.mmd` — final System Architecture source
2. `report/use-case-diagram.svg`
3. `report/dfd-level-0.svg`
4. `report/dfd-level-1.svg`
5. `report/dfd-level-2-commerce.svg`
6. `report/sequence-checkout-payment.svg`
7. `report/erd-core-report.svg`
8. `report/class-diagram.svg`

Editable manual sources for items 2–8 belong in:

`report-src/*.drawio`

## Ownership

- System Architecture is maintained as Mermaid in this directory.
- Use Case, DFD Level 0, DFD Level 1, DFD Level 2, Sequence, report ERD and Class Diagram are being produced manually under issues #195–#201.
- Their editable `.drawio` sources belong in `report-src/`.
- Their report-ready SVG exports belong in `report/`.

## Detailed data-model reference

The detailed 53-entity logical ERD is not a report-facing diagram and is stored at:

`docs/requirements/erd-logical-detailed.mmd`

It supports the canonical data dictionary and data-model documentation.
