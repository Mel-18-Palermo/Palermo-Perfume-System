# Final SRS Appendix Evidence Index

## Purpose

This index identifies supporting Palermo material suitable for Final SRS Section 16 Appendix. It distinguishes current technical evidence from planned or pending evidence; it does not turn coverage references into a test PASS claim.

The appendix should support the report rather than duplicate the entire repository.

## Recommended appendix evidence

| Appendix item | Repository source | Why include |
|---|---|---|
| Full functional requirement registry | `docs/requirements/functional-requirements.md` | Preserves all 91 source entries and source-number anomaly |
| Approved derived requirement registry | `docs/requirements/derived-requirements.md` | Makes the four source-gap modules transparent |
| Full NFR registry / measurable criteria | `docs/requirements/non-functional-requirements.md` | Supports the condensed NFR discussion |
| Final traceability matrix | `docs/requirements/traceability-matrix.csv` | Shows the frozen requirement IDs alongside current implementation paths, linked implementation issues/merged PRs where verified, automated-test locations and explicit incomplete/unverified states |
| Critical-journey regression map | `docs/testing/critical-journey-regression.md` | Documents the automated regression scope, isolation controls and known exclusions for issue #283; “Covered” in this map is coverage documentation, not a recorded final execution result |
| Current automated test suites | `tests/unit/`, `tests/integration/`, `tests/e2e/` | Provides repository-resident unit, integration and isolated Playwright evidence named by the traceability matrix |
| Current implementation and persistence evidence | `src/`, `prisma/` | Provides the implementation paths and Prisma schema/migration evidence cited by the traceability matrix |
| Decision register | `docs/requirements/decision-register.md` | Documents approved ambiguity/scope decisions |
| Detailed logical ERD | `docs/requirements/erd-logical-detailed.mmd` | Supports the concise core ERD |
| Full data dictionary | `docs/requirements/data-dictionary.csv` | Supports Section 11 without crowding main body |
| DPIA supporting retention schedule | `docs/privacy/retention-schedule.csv` | Supports privacy/retention rationale |
| DPIA/risk supporting evidence | relevant `docs/privacy/` sources | Supports Section 12 risk/control summary |
| Detailed use-case specifications | `docs/srs/use-cases/` | Supports the report-facing use-case figure |
| UI detailed specifications | `docs/ui/` | Supports selected Section 5 visual evidence |
| NFR validation profile | `docs/testing/nfr-validation-profile.txt` | Shows how measurable NFRs are intended to be verified; it is not execution evidence |
| WBS/Gantt detailed data | `docs/project-management/wbs-gantt.csv` | Supports report-facing WBS/Gantt |
| Supervisor feedback evidence | actual feedback evidence + `docs/srs/supervisor-feedback-response-ledger.md` | Supports Section 15 |
| GitHub contribution/iteration evidence | issue/PR references selected by team | Supports project management/version-control evidence where required |

## Pending final-QA evidence

- Customer final QA for issue #418 is in open PR #440, not merged into `main` at the time of this index update. Its proposed `docs/testing/final-customer-qa.md` is therefore not repository evidence for a PASS claim.
- Administrator final QA for issue #417 is in open PR #441, not merged into `main` at the time of this index update. Its proposed `docs/testing/final-admin-qa.md` is therefore not repository evidence for a PASS claim.
- The matrix retains “execution result unverified” and NFR measurement gaps until an executed result is present on the evaluated baseline.

## Appendix exclusions

Do not use the appendix to:

- hide unsupported scope;
- dump every GitHub screenshot;
- present stale interim assumptions as current;
- include secrets, credentials, raw card information or real customer data;
- claim planned tests were executed;
- duplicate every main-report figure at full size.

## Selection rule

Include supporting evidence that materially helps a marker verify:

- provenance;
- traceability;
- design depth;
- privacy/security decisions;
- project planning;
- iteration/change control.

If an artefact does not improve verification, leave it in the repository rather than padding the appendix.
