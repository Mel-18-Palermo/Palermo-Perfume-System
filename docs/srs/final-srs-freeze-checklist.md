# Final SRS v1.0 Freeze Checklist

## Purpose

Run this checklist immediately before declaring the Palermo Final SRS v1.0 baseline frozen for implementation.

A checked item means supporting repository/report evidence was actually reviewed.

## A. Required report structure

- [ ] Section 1 Introduction assembled from current source.
- [ ] Section 2 Project Deliverables includes WBS/Gantt evidence.
- [ ] Section 3 FR/DER/NFR provenance is correct.
- [ ] Section 4 approved architecture figure inserted.
- [ ] Section 5 UI evidence inserted and class diagram included without changing the required numbered structure.
- [ ] Section 6 Use Case Diagram inserted from reviewed SVG.
- [ ] Section 7 DFD Level 0 inserted from reviewed SVG.
- [ ] Section 8.1 DFD Level 1 inserted from reviewed SVG.
- [ ] Section 8.2 DFD Level 2 inserted from reviewed SVG.
- [ ] Section 9 checkout/payment Sequence Diagram inserted from reviewed SVG.
- [ ] Section 10 core report ERD inserted.
- [ ] Section 11 Data Dictionary included/condensed appropriately.
- [ ] Section 12 DPIA included.
- [ ] Section 13 methodology plus development environment/folder structure included.
- [ ] Section 14 testing + implementation plan included.
- [ ] Section 15 contains only actual supervisor feedback/responses.
- [ ] Section 16 appendix contains supporting evidence rather than repository dump.

## B. Diagram artefacts

For every report diagram below, confirm both editable source and SVG export exist and represent the same diagram.

- [ ] `docs/diagrams/report-src/use-case-diagram.drawio`
- [ ] `docs/diagrams/report/use-case-diagram.svg`
- [ ] `docs/diagrams/report-src/dfd-level-0.drawio`
- [ ] `docs/diagrams/report/dfd-level-0.svg`
- [ ] `docs/diagrams/report-src/dfd-level-1.drawio`
- [ ] `docs/diagrams/report/dfd-level-1.svg`
- [ ] `docs/diagrams/report-src/dfd-level-2-commerce.drawio`
- [ ] `docs/diagrams/report/dfd-level-2-commerce.svg`
- [ ] `docs/diagrams/report-src/sequence-checkout-payment.drawio`
- [ ] `docs/diagrams/report/sequence-checkout-payment.svg`
- [ ] `docs/diagrams/report-src/erd-core-report.drawio`
- [ ] `docs/diagrams/report/erd-core-report.svg`
- [ ] `docs/diagrams/report-src/class-diagram.drawio`
- [ ] `docs/diagrams/report/class-diagram.svg`

Visual checks:

- [ ] Landscape/report-readable where required.
- [ ] White/minimal background/style.
- [ ] No overlapping text.
- [ ] No connector-label collisions.
- [ ] No page-boundary clipping.
- [ ] Exact canonical labels.
- [ ] No invented external actors/services.
- [ ] DFDs use Gane & Sarson notation.
- [ ] DFD Level 0 contains no data stores.
- [ ] Delivery simulator remains internal.
- [ ] Source and SVG match.

## C. Requirement integrity

- [ ] 91 source FR entries preserved.
- [ ] Source number 78 duplication preserved/explained.
- [ ] 14 approved `DER-*` requirements remain separate from source FRs.
- [ ] 33 NFR categories preserved.
- [ ] Requirement IDs used in report match canonical registry.
- [ ] No derived requirement is described as client-numbered source scope.
- [ ] No source gap is silently filled without DER/decision provenance.
- [ ] Traceability matrix is current.

## D. Scope invariants

- [ ] No guest checkout.
- [ ] Visitor temporary cart wording is preserved.
- [ ] No unapproved Customer-cart persistence guarantee.
- [ ] No raw PAN/CVV storage.
- [ ] Stripe remains sandbox/test baseline for capstone.
- [ ] Refund/exchange/return authorisation is not invented.
- [ ] One baseline shipment/order; no split/partial/multi-warehouse fulfilment.
- [ ] Delivery simulator is internal.
- [ ] Production batches refer to finished perfume, not manufacturing ERP/raw-material planning.
- [ ] Community baseline is public reviews, not social network functionality.
- [ ] Loyalty is simple points; no tiers unless approved later.
- [ ] Subscription is opt-in/out only; no recurring billing.
- [ ] Promotional content has no auto-post/scheduler baseline.
- [ ] AI promotional output requires human approval.
- [ ] Fragrance sensitivity remains non-medical.
- [ ] Weather suggestions do not require an external live-weather provider.
- [ ] Tax/GST treatment is not invented.

## E. Architecture/security/privacy consistency

- [ ] Next.js + TypeScript modular monolith is used consistently.
- [ ] Prisma + Supabase PostgreSQL are used consistently.
- [ ] No stale standalone React + Node architecture remains.
- [ ] No microservice architecture is implied.
- [ ] Provider integrations are behind controlled boundaries/adapters.
- [ ] Server remains authoritative for protected business state.
- [ ] RBAC is deny-by-default / least privilege.
- [ ] Ownership controls exist in use cases/design for customer-specific data.
- [ ] AI context is minimised and bounded.
- [ ] AI is not authoritative for Palermo business facts.
- [ ] DPIA retention values agree with supporting schedule.
- [ ] No medical/health or unrelated sensitive-data inference is introduced.
- [ ] No real customer/payment data is required for test/demo.

## F. Testing/implementation honesty

- [ ] Application implementation is not represented as complete in the SRS.
- [ ] Planned tests are not marked PASS.
- [ ] Traceability Issue/PR/Test/Result fields remain evidence-driven.
- [ ] Measurable NFR targets are described as acceptance/verification targets.
- [ ] Demo/sandbox/simulated behaviour is not described as production operation.
- [ ] Exact deployment/provider choices not yet frozen are not presented as approved facts.

## G. Project-management integrity

- [ ] Final SRS freeze occurs before application implementation baseline.
- [ ] WBS/Gantt distinguishes official course milestone weeks from internal engineering allocation.
- [ ] Contribution claims are backed by repository evidence.
- [ ] External/non-team authorship anomalies are not merged into accepted team deliverables.
- [ ] One issue / scoped branch / PR workflow is followed for accepted work.
- [ ] Material post-freeze scope change requires documented change control.

## H. Supervisor feedback

- [ ] Actual feedback evidence collected.
- [ ] Every Section 15 feedback item has a response.
- [ ] Every claimed response links to repository/report evidence.
- [ ] No rubric item or internal review comment is misrepresented as supervisor feedback.

## I. Final report quality

- [ ] Terminology is consistent across text, diagrams and tables.
- [ ] Figure/table labels are consistent.
- [ ] Report does not contain obsolete filenames/paths.
- [ ] No duplicate/conflicting diagrams.
- [ ] No stale interim technical assumptions.
- [ ] No unsupported completion/acceptance claims.
- [ ] Appendix supports rather than duplicates the report.
- [ ] Final report editor independently checks course academic-integrity requirements.

## Freeze record

Complete only when the checklist is satisfied:

- SRS baseline version/tag: ____________________
- Main commit SHA: _____________________________
- Freeze date: _________________________________
- Open approved change requests after freeze: ___
- Reviewed by: __________________________________
