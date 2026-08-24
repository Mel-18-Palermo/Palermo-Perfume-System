# Final SRS diagram workspace

## Final report artefacts

The Final SRS uses exactly eight system/design diagrams:

1. `system-architecture.mmd` — System Architecture (already final)
2. `report/use-case-diagram.svg`
3. `report/dfd-level-0.svg`
4. `report/dfd-level-1.svg`
5. `report/dfd-level-2-commerce.svg`
6. `report/sequence-checkout-payment.svg`
7. `report/erd-core-report.svg`
8. `report/class-diagram.svg`

Editable manual sources for items 2–8 belong in:

`report-src/*.drawio`

## Current technical/reference sources

Until the delegated report drawings are approved, the existing Mermaid sources remain available as technical references:

- `use-case-diagram.mmd`
- `dfd-level-0.mmd`
- `dfd-level-1.mmd`
- `dfd-level-2-commerce.mmd`
- `sequence-checkout-payment.mmd`
- `erd-core.mmd`
- `erd-logical-detailed.mmd`
- `class-diagram.mmd`

They are not the final report renders unless explicitly selected.

## Cleanup policy

The broken generated Gane & Sarson SVG attempts and temporary diagram note files have been removed.

After all seven delegated manual diagram PRs merge:
- keep the seven `.drawio` files and seven report `.svg` exports;
- keep `system-architecture.mmd`;
- keep `erd-logical-detailed.mmd` only as a technical/appendix reference if still useful;
- remove or move obsolete report-unfriendly Mermaid sources so there is one obvious report artefact per diagram.
