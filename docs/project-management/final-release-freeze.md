# Final Release Freeze

## Freeze declaration

- **Date:** 29 September 2026 (AEST)
- **Application release baseline:** [`3ac1b426e965f52627a884475b52c6a624f76c85`](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/commit/3ac1b426e965f52627a884475b52c6a624f76c85) (`origin/main`, verified before this record)
- **Controlled Production demonstration:** <https://www.palermoperfumes.store/> — a university demonstration deployment, not a commercial live store.
- **Freeze status:** final known-good application baseline frozen. This documentation-only record/PR does not change runtime behaviour and is distinct from the application baseline.

## Validation evidence

| Area | Evidence | Result |
| --- | --- | --- |
| Quality / CI and build | [#446 CI run 36500839813](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/actions/runs/36500839813): type-check, lint, unit/contract tests and production build; database integration; Browser E2E; CI gate | PASS |
| Baseline/tree equivalence | #446 head [`06e40ee04d0c5322c836e6683a7504579a61fa50`](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/commit/06e40ee04d0c5322c836e6683a7504579a61fa50) and frozen main baseline have identical tree SHA `717bbc86a0b8b3ad693bd3ae19c2d57b34070750` | PASS — #446 CI validated the same repository tree |
| Customer QA | [#418](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/418) / [#440](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/440): Chromium at 375, 768 and 1440 px | PASS |
| Administrator QA | [#417](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/417) / [#441](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/441): Chromium at 375, 768 and 1440 px | PASS |
| Security / NFR | [#288](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/288) and [release-candidate recheck](../security/288-release-candidate-recheck.md) | PASS with recorded limitations |
| Production deployment | [Vercel Production deployment 6723410701](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/deployments/6723410701), SHA `3ac1b426…` | SUCCESS |
| Production smoke | Read-only HTTP checks on 29 September 2026: `/` 200; `/api/health` 200; `/catalogue` 200 | PASS |
| Database migrations | Existing Production provisioning evidence: `palermo_prod`, 16 repository / 16 applied; no missing, unexpected or failed migrations | PASS |
| Dataset state | 22 active canonical products; 2 intentionally archived legacy demo products; deterministic synthetic presentation history; Production/Preview isolation confirmed with a Production-only sentinel order | VERIFIED (no database operation run) |

## Database / demonstration state

The schema is `palermo_prod`. Demonstration data is controlled, synthetic data; no connection values are recorded here. The approved catalogue is defined by [`prisma/catalogue-data.ts`](../../prisma/catalogue-data.ts) and populated by [`prisma/populate-catalogue.ts`](../../prisma/populate-catalogue.ts). Deterministic history is defined by [`prisma/demo-history/`](../../prisma/demo-history/) (profile `presentation-v1`) and owner-operated through [`prisma/populate-demo-history.ts`](../../prisma/populate-demo-history.ts). No separate semantic seed version is declared, so this state is identified by this frozen application SHA, those paths, the counts above, and the 16/16 migration state.

## Known limitations

- Final manual browser QA was Chromium-only; it is not exhaustive cross-browser certification.
- Final QA used safe/read-only flows where appropriate, rather than destructive state injection.
- This is not a WCAG certification claim.
- Stripe remains in test mode.
- Supabase Auth is project-scoped/shared while application schemas are isolated.
- [#286](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/286) remains open: the legacy `pnpm demo:reset` fixture is not the authoritative one-command recreation of the final 22-product Production presentation dataset and must not be used as a Production recovery procedure.
- The dependency advisories assessed in [#288](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/288) remain recorded limitations; they were not silently upgraded immediately before presentation.

## Freeze policy

After this freeze, no feature work or late contributor feature submissions may be accepted. Only demonstrable release-blocking fixes may be accepted; each such fix must reopen validation and produce a new known-good application SHA.
