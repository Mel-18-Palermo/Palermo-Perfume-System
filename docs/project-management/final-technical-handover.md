# Final Technical Handover

## Frozen release

- **Current repository SHA (after #447):** [`a75e406f65ef793d5aade2e359632225f540ad83`](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/commit/a75e406f65ef793d5aade2e359632225f540ad83). This includes the #447 freeze documentation.
- **Frozen application baseline:** [`3ac1b426e965f52627a884475b52c6a624f76c85`](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/commit/3ac1b426e965f52627a884475b52c6a624f76c85), as recorded in the [final release freeze](final-release-freeze.md).
- **Controlled Production:** <https://www.palermoperfumes.store/>.
- **Runtime status:** application runtime was frozen under [#289](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/289). The current repository SHA is documentation-only release-closeout history; it is not a new application baseline.

## Run and validation commands

The canonical scripts are defined in [`package.json`](../../package.json):

```sh
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:e2e
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm catalogue:populate
pnpm demo:populate-history
```

`pnpm demo:reset` is legacy deterministic isolated-demo tooling. It is **not** the Production recovery path for the final 22-product dataset; see the closed [#286 disposition](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/286).

## Environment topology

| Target | Application schema | Authority / purpose |
| --- | --- | --- |
| Local / controlled development | `palermo` | approved local development tooling |
| Test | `palermo_test` | disposable database integration and E2E tooling |
| Vercel Preview | `palermo` | preview application data |
| Vercel Production | `palermo_prod` | controlled synthetic demonstration data |

Production runs on Vercel with Supabase PostgreSQL and Auth, using verify-full TLS. Migration-owner credentials are excluded from the Vercel runtime. Supabase Auth remains a documented shared-project limitation, while application schemas and runtime roles are isolated. See the [Prisma operations guide](../../prisma/README.md) and [#419 provisioning evidence](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/419).

## Database and migration authority

Committed Prisma migrations are the repository schema authority. At freeze, Production had **16/16** repository migrations applied, with no missing, unexpected, or failed migrations. Migrations are owner-operated through `pnpm db:migrate`; they are not Vercel runtime application behaviour. See the [current Prisma README](../../prisma/README.md), [#419](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/419), and the [freeze evidence](final-release-freeze.md).

## Demonstration data

The approved catalogue manifest and [population tool](../../prisma/populate-catalogue.ts) define the canonical catalogue. The owner-operated [`presentation-v1` deterministic synthetic history](../development/demo-history.md) is populated with `pnpm demo:populate-history`. The [#286 disposition](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/286) records why no destructive one-command Production reset was introduced after freeze.

Final state: **22 active canonical products** and **2 archived legacy demo products**. Demonstration requires no real customer or payment data.

## Architecture pointers

- [Root README](../../README.md)
- [Security policy](../../SECURITY.md)
- [Implementation handbook](../development/implementation-handbook.md)
- [Frontend contracts](../development/frontend-contracts.md)
- [Prisma operations](../../prisma/README.md)
- [Security/NFR release-candidate recheck](../security/288-release-candidate-recheck.md)
- [Final release freeze](final-release-freeze.md)
- [Final customer QA](../testing/final-customer-qa.md)
- [Final administrator QA](../testing/final-admin-qa.md)
- [Demo-history operations](../development/demo-history.md)

## Release evidence map

| Evidence | Canonical source |
| --- | --- |
| Customer QA | [Final customer QA](../testing/final-customer-qa.md); [#418](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/418); [#440](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/440) |
| Administrator QA | [Final administrator QA](../testing/final-admin-qa.md); [#417](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/417); [#441](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/441) |
| Security / NFR | [Release-candidate recheck](../security/288-release-candidate-recheck.md); [#288](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/288); [#446](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/446) |
| Production provisioning / isolation | [#419](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/419) |
| Release freeze | [Final release freeze](final-release-freeze.md); [#447](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/447) |
| Governance gate | [#289](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/289) |
| Database / migrations | [Prisma operations](../../prisma/README.md); [#419](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/419) |
| Final documentation | [#445](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/445); [#447](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/pull/447) |

## Known limitations

- Final manual QA was Chromium-only.
- Production QA coverage was safe/read-only where appropriate.
- This is not a WCAG certification claim.
- Stripe remains in test mode.
- Supabase Auth remains project-scoped/shared.
- Dependency advisories were assessed under [#288](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/288).
- There is no one-command Production recreation of the final dataset; see the closed [#286 disposition](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/286).

## Contribution and history preservation

Git history remains authoritative for implementation history. Issues and pull requests retain allocation, review, and completion evidence. Do not rewrite contributor history; the current contribution record should reflect actual completed work.

## Operational closeout

No further feature work follows this freeze. Any future runtime change creates a new release candidate and requires validation again. Secrets must remain outside the repository. Production data mutations require explicit owner intent and the existing safety controls.
