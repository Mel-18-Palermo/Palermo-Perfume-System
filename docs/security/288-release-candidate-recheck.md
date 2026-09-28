# Final Security / NFR Release-Candidate Recheck

- Date: 29 September 2026 (AEST)
- Exact tested baseline SHA: `2dd4faa6a54ec060c04f71b68b3bf9bd5c4ac702`
- Deployment target: `https://www.palermoperfumes.store/` (Production)

## Release-blocker checklist

| Area | Evidence | Result | Notes |
| --- | --- | --- | --- |
| Auth / RBAC | `src/modules/identity/service.ts`; protected route guards; `tests/integration/identity-cases.ts`; `tests/unit/critical-route-boundaries.test.ts` | PASS | Customer role and administrator permission checks resolve the server-side principal; tested denial paths do not invoke protected handlers. |
| Secret exposure | Tracked-file scan; `.env.example`; `SECURITY.md`; runtime configuration documentation | PASS | No tracked `.env.local` or credential file was found. No committed live credential pattern or privileged `NEXT_PUBLIC_` variable was found. Production documentation excludes migration, test, service-role and demo credentials. Values were not inspected or printed. |
| Payment authority | `src/modules/commerce/payment/service.ts`; `src/modules/commerce/payment/README.md`; `tests/unit/payment-stripe.test.ts` | PASS | Stripe test-mode configuration is enforced server-side; raw webhook signature verification, idempotency and transactional payment finalisation remain server-owned. No live charge was attempted. |
| Inventory authority | `src/modules/commerce/payment/service.ts`; existing payment/inventory integration coverage | PASS | Verified successful payment atomically claims active reservations, decrements balances, creates movements and confirms the order. Browser state cannot perform those transitions. |
| AI / privacy boundary | `src/integrations/ai/openai-support-provider.ts`; support/recommendation tests; `docs/privacy/dpia.md` | PASS WITH KNOWN LIMITATION | Provider calls are server-only, output/context are bounded and provider failure is isolated. DPIA residual risks and pre-launch provider/retention review limitations remain documented. No personal data was sent to a provider. |
| Dependency audit | `pnpm audit --prod --audit-level=high`; `pnpm why` results; lockfile and current image configuration | PASS WITH KNOWN LIMITATION | Three High package advisories remain; assessed below. No project-attributable reachable High/Critical release blocker was demonstrated. |
| Responsive/browser | #281 closure evidence; #287/#444 evidence; merged #440/#441 Production Chromium QA; successful baseline Browser E2E CI; public `/catalogue` smoke | PASS WITH KNOWN LIMITATION | #281 was explicitly superseded by final RC work. #287 produced the #444 catalogue blocker repair. #440 and #441 exercised customer and administrator read-only routes at 375, 768 and 1440 px with no release-blocking defect, page-level overflow or unexpected runtime error. |
| Accessibility | Merged #440/#441 keyboard/focus observations; existing route/UI evidence; successful baseline Browser E2E CI | PASS WITH KNOWN LIMITATION | In #440/#441, the first Tab reached a focusable control on each exercised route at all three viewports; no critical-control clipping/overlap was observed. No known Critical/Serious project-attributable issue remains in this scoped evidence. This is not a WCAG certification or a full accessibility audit. |
| Build / CI | GitHub Actions CI run `36497310847` for this SHA | PASS | Quality checks, database integration, Browser E2E and CI gate succeeded. No local build/test rerun was needed because this change is documentation only. |
| Deployment | GitHub Production deployment `6722753980`; `GET /api/health`; `GET /catalogue` | PASS | Deployment status was success; both public endpoints returned HTTP 200. Health is process liveness only, not a dependency/security probe. |
| Database/migrations | Existing #419 provisioning evidence supplied for this recheck | PASS | `palermo_prod`: 16 repository migrations / 16 applied, no missing/unexpected/failed migrations; 22 active canonical products and 2 intentionally archived legacy demos. Schema isolation was previously demonstrated with a Preview-absent sentinel order. No database operation was run. |

## Dependency audit

Command run:

```text
pnpm audit --prod --audit-level=high
```

The command reported four advisories total (one moderate and three High). The High findings were:

| Package | Severity | Dependency path | Palermo exposure assessment | Classification | Release-blocking |
| --- | --- | --- | --- | --- | --- |
| `deepmerge-ts@7.1.5` | High | `@prisma/client > prisma > @prisma/config > deepmerge-ts` | Advisory affects recursive-object merging. This package is reached through Prisma configuration/tooling, not Palermo request handling. The deployed application uses PostgreSQL and does not supply untrusted Prisma configuration graphs. | C — build/tooling/transitive-only for this deployed path | No |
| `mysql2@3.15.3` | High | `@prisma/client > prisma > mysql2` | Advisory requires a MySQL authentication-plugin downgrade. Palermo's deployed database path is PostgreSQL/Supabase, not MySQL; no MySQL connection path is configured or used. | C — build/tooling/transitive-only for this deployed path | No |
| `sharp@0.35.3` | High | `next > sharp` | Next depends on `sharp`; current catalogue assets are vetted local files, and `next.config.ts` has no remote image optimisation allow-list. No project route accepting attacker-supplied HEIF content for server-side optimisation was identified. The package remains a known advisory and should be revisited outside the RC freeze. | B — production dependency, but affected preconditions are not used/exposed by the current Palermo deployment | No |

No dependency was changed: the audit did not demonstrate a production-runtime reachable, project-attributable High/Critical defect for which a bounded update had lower risk than leaving the locked release candidate unchanged.

## Known limitations

- `pnpm audit` still reports the three High advisories above; their current exposure assessment is not a claim that the packages are defect-free in all deployments.
- The DPIA records residual Medium risks for AI context mistakes, voluntarily submitted free text, backup retention, and provider hosting/contract review. It does not claim a jurisdiction-specific legal or processor review.
- #440 and #441 provide Chromium-only, read-only Production QA; forced loading/error/retry/empty/pending states and other browser families were not exercised. This recheck does not claim WCAG certification.

## Conclusion

No known project-attributable Critical/High security defect or release-blocking NFR regression was identified in this recheck.
