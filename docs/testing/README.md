# Testing documentation

## Current entry points

| Command | Purpose |
| --- | --- |
| `pnpm test` | unit and contract tests |
| `pnpm test:db` | database integration tests against disposable `palermo_test` |
| `pnpm e2e:customer` / `pnpm e2e:admin` | targeted Playwright critical journeys |
| `pnpm test:e2e` | resets, migrates, seeds and runs both local E2E journeys |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | repository type, lint and production-build checks |

Database and browser-E2E tooling must use an explicitly isolated local/CI target. It must not target `palermo_prod`; external provider calls are not required for the deterministic test suites.

## Documents

- [`system-testing-plan.md`](system-testing-plan.md) — test basis, intended coverage and acceptance approach. This is a planning document, not a statement that every criterion has been demonstrated.
- [`critical-journey-regression.md`](critical-journey-regression.md) — automated regression map and its stated exclusions.
- `final-customer-qa.md` and `final-admin-qa.md` — dated final QA evidence when present; read with their recorded environment and time.
- [`nfr-validation-profile.txt`](nfr-validation-profile.txt) — measurable non-functional validation profile.

Use current CI/PR evidence for the status of a particular revision. Historical test plans and reports preserve the evidence available when they were written.
