# Software Development Environment and File/Folder Structure

## Purpose

This document defines the software development environment and repository structure for the Palermo Perfume System.

**Status update:** at the original SRS baseline, application implementation had not yet started, and this document described the *planned* environment only. Implementation has since begun. This revision keeps the approved architecture/technology decisions from that baseline, and replaces the sections that were previously "planned"/"proposed" with the now-verified, actual configuration, folder structure and commands present in the repository. Where a described capability does not yet exist (see [#271](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/271)), this is marked **Pending** rather than presented as complete.

---

## 1. Approved Architecture and Technology Decisions

These decisions were frozen at the SRS baseline and remain the architecture of the implemented system.

**Application platform:** Next.js, React, TypeScript. Next.js provides the web application runtime and routing/application framework; React provides the component UI model; TypeScript is used for typed application code and contracts. The architecture is a **modular monolith**, not a microservice system.

**Data access and database:** Prisma ORM/data access over Supabase-hosted PostgreSQL. Critical multi-record operations (checkout, inventory reservation/commit, other protected business outcomes) must use database constraints and transactions. Supabase is managed PostgreSQL infrastructure, not a business actor.

**Payment:** Stripe, test/sandbox mode, isolated behind an internal payment-provider adapter. Palermo stores only approved payment state/provider references — never raw PAN/CVV.

**AI:** accessed through a replaceable provider interface/adapter, supporting deterministic mock/stub responses for testing, controlled test provider configuration, minimised approved request context, and failure/timeout handling that does not break core commerce.

**Email:** accessed through an integration adapter; provider selection remains an implementation/deployment decision; development/testing may use a safe test configuration or mock adapter.

**Delivery:** an internal delivery simulator behind a `DeliveryProvider`-style abstraction; no production courier account is required for the capstone baseline.

**Version control and collaboration:** Git + GitHub, a protected `main` integration branch, GitHub Issues, short-lived scoped branches, Pull Requests, and a rebase-merge workflow (`Issue → Branch → Commit → Pull Request → Review → Rebase Merge → Delete Branch`). There is no shared `develop` branch.

**Documentation and modelling:** maintained under `docs/` using Markdown, CSV/text for structured registries, Mermaid for technical/architecture modelling, and draw.io/diagrams.net + exported SVG for final report diagrams.

**Development editor and OS:** no single mandatory editor or OS; any environment supporting TypeScript, Git and the Node.js/Next.js toolchain is acceptable. `.editorconfig` reduces cross-environment formatting differences.

**Browser/test targets:** current stable Chrome, Firefox, Edge, Safari. Responsive validation widths: **375px, 768px, 1440px**. Staging/test environments use seeded non-real data and test/sandbox integrations only.

**Security configuration:** environment-specific secrets are never committed. The implementation must prevent commits of database credentials, auth secrets/tokens, Stripe secret keys, AI provider secrets, email-provider credentials, real customer data, or raw payment-card data. Public/client-safe configuration is distinguished from server secrets. Sensitive connections use HTTPS/TLS.

---

## 2. Runtime and Package Management — *now confirmed*

| Requirement | Value | Source |
|---|---|---|
| Node.js | `24.x` | `package.json` → `engines.node`, also pinned in `.nvmrc` |
| Package manager | `pnpm 11.24.0` | `package.json` → `packageManager` |

The project uses **pnpm exclusively** — do not use `npm` or `yarn`. The committed `pnpm-lock.yaml` and CI (`pnpm install --frozen-lockfile`) both assume pnpm.

---

## 3. Current Repository Structure — *now confirmed*

The repository has moved beyond the documentation-only SRS stage. Confirmed top-level areas include:

```
Palermo-Perfume-System/
├── .github/workflows/       # CI (ci.yml) and Governance gate workflows
├── docs/                    # SRS, diagrams, requirements, testing, ui, etc.
├── prisma/                  # schema, migrations, seed.ts, check.ts, certs/
├── src/
│   ├── app/                 # Next.js routes (e.g. app/account/, app/api/)
│   ├── components/          # shared UI (components/ui/, components/layout/)
│   ├── contracts/           # canonical TypeScript contracts (e.g. profile.ts)
│   ├── integrations/        # provider adapters
│   └── lib/                 # cross-cutting infra, incl. lib/api client
├── .env.example
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

Some module-level detail from the original proposed structure (below) is still being built out feature-by-feature and is not all confirmed to exist yet; this section reflects only what is verified against the current repository.

---

## 4. Proposed Implementation Structure (baseline reference)

The following remains the target organisation for the modular-monolith application, carried over from the SRS baseline. Names may be refined during implementation, but the architectural separation should hold:

```
src/
├── app/            # Next.js routing, layouts, entry surfaces
├── components/     # Reusable presentational/interface components
├── modules/        # Business-domain boundaries (identity, catalogue,
│                   #   discovery, personalisation, commerce, inventory,
│                   #   delivery, support, administration, participation)
├── integrations/   # Provider-specific adapters (payment, ai, email, delivery)
├── lib/            # Cross-cutting infra (db, auth, validation, logging, config)
└── types/
tests/
├── unit/
├── integration/
└── e2e/
```

**Dependency direction (still binding):** UI/routes call approved application/domain services; domain rules do not depend directly on provider SDKs; integrations implement internal provider contracts; Prisma/database access stays server-side; external/user input is validated at trust boundaries; authorisation is enforced independently of UI visibility; payment/inventory/order invariants are protected by server logic plus persistence controls.

---

## 5. Install

```bash
pnpm install --frozen-lockfile
```

This is the exact command CI runs on every pull request and push to `main` (`.github/workflows/ci.yml`, both the `quality` and `database` jobs).

---

## 6. Environment Variables (names only — no values, no secrets)

Copy `.env.example` to `.env` and fill in values from your own isolated development/preview Supabase and Stripe test-mode projects.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Application DB connection (pooler `6543`/`5432`), schema `palermo` |
| `DIRECT_URL` | Prisma migrations connection |
| `TEST_DATABASE_URL` | Optional disposable test-schema connection (`schema=palermo_test`) |
| `PALERMO_DATABASE_ENV` | Must be `development` or `preview` for seed/test — never production |
| `DATABASE_CA_FILE` | Path to the public Supabase root CA cert |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Server-only Supabase Auth connection for this environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional, owner-only provisioning/live-test tooling |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe **test-mode only**; secret key never exposed to browser code |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test-mode publishable key (browser-safe) |

All database URLs require `sslmode=verify-full`. The health/home scaffold runs without database credentials. CI provisions its own ephemeral PostgreSQL and uses no hosted credentials. On Vercel, isolated values go to **Preview only**; Production is configured separately by the project owner. `TEST_DATABASE_URL` and migration-owner credentials must never reach a live runtime.

---

## 7. Database: Generate, Migrate, Seed, Check

| Command | What it does |
|---|---|
| `pnpm db:generate` | `prisma generate` — regenerates the Prisma client |
| `pnpm db:migrate` | `prisma migrate deploy` — applies pending migrations |
| `pnpm db:seed` | `tsx prisma/seed.ts` — seeds the database |
| `pnpm db:check` | `tsx prisma/check.ts` — database integrity/sanity check |

**Pending — [#271](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/271):** a dedicated, deterministic *demo reset* workflow and documented known demo accounts do not exist yet. The commands above are real and runnable today; the guaranteed-repeatable "reset to known demo state" flow will be documented once #271 merges.

---

## 8. Development Server

```bash
pnpm dev
```

Runs `next dev` (default `http://localhost:3000`).

---

## 9. Lint, Type-check, Test, Build

| Command | What it does |
|---|---|
| `pnpm lint` | `eslint . --max-warnings=0` |
| `pnpm typecheck` | `prisma generate && next typegen && tsc --noEmit` |
| `pnpm test` | `vitest run` — unit/contract tests |
| `pnpm test:db` | `vitest run --config vitest.db.config.ts` — DB integration tests |
| `pnpm build` | `prisma generate && next build` |

Same order CI runs them in the `quality` job.

---

## 10. Database Integration Tests Locally

CI's `database` job provisions ephemeral PostgreSQL 17.6, applies `.github/workflows/ci-database.sql`, generates the Prisma client, then runs `pnpm test:db`. To reproduce locally: run Postgres 17.6 (e.g. via Docker), apply the same SQL script, set `TEST_DATABASE_URL` (schema `palermo_test`) and `PALERMO_DATABASE_ENV=development`, then run `pnpm db:generate && pnpm test:db`. Never point this at a hosted/shared database.

---

## 11. Continuous Integration

`.github/workflows/ci.yml` runs on every PR and push to `main`, with three jobs gated together: `quality` (install → typecheck → lint → test → build), `database` (ephemeral Postgres → provision → generate → `test:db`), and `gate` (requires both to succeed). A separate `Governance gate` workflow requires an `APPROVED` review from the project owner on the current PR head commit before merge (unless the owner is the author) — it only reads PR/review metadata, never executes PR code.

---

## 12. Preview Deployment Interpretation

Vercel auto-deploys a Preview per PR; find it via the `Vercel` check on the PR or the bot's environment link. A failing Vercel check ("Deployment has failed") is a build failure separate from the `CI` checks — diagnose via the linked Vercel deployment logs, not the GitHub Actions logs. Preview uses Preview-scoped env vars only.

---

## 13. Production / Demo Deployment Authority

Per [#243](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/243), production/demo deployment configuration on Vercel is performed by the project's technical owner outside source control — not part of the normal contributor PR workflow. Contributors do not perform manual production deployment.

---

## 14. Common Safe Troubleshooting

| Symptom | Safe next step |
|---|---|
| `pnpm install` misbehaves | Check local Node/pnpm exactly match `engines`/`packageManager` |
| `pnpm typecheck` fails after pulling | It already regenerates Prisma + Next types first — confirm the full command ran, not a partial `tsc` |
| `pnpm test:db` fails locally | Confirm Postgres 17.6 running, `ci-database.sql` applied, `TEST_DATABASE_URL`/`PALERMO_DATABASE_ENV` set |
| CI `database` job fails, `quality` passes | Isolated to DB provisioning/`test:db` — check that job's logs specifically |
| PR `Governance gate` fails | Current head commit lacks an `APPROVED` review from the owner on that exact SHA — expected after any new commit |
| Vercel Preview looks stale | Confirm the push reached the PR branch; check the `Vercel` check's commit SHA |
| `pnpm build` fails only for you | CI builds with **no** service credentials configured — a build that needs real env values indicates an unwanted runtime dependency at build time |

---

## 15. Environment Reproducibility — *now confirmed*

- Committed dependency lockfile (`pnpm-lock.yaml`) ✅
- Runtime/package-manager version metadata pinned (`engines`, `packageManager`, `.nvmrc`) ✅
- Prisma migrations tracked under `prisma/migrations/` ✅
- Repeatable seed command (`pnpm db:seed`) exists ✅ — full deterministic demo/reset workflow: **Pending #271**
- `.env.example` present, names-only ✅
- CI uses the same install/build/test commands as local development ✅
- Documented setup steps: this document ✅

---

## Verification Note

*(To be completed by whoever runs this runbook against a clean checkout. Do not mark a step verified without having actually run it.)*

- [ ] `pnpm install --frozen-lockfile` — ran on a clean checkout
- [ ] `pnpm dev` — server started successfully
- [ ] `pnpm lint` — ran successfully
- [ ] `pnpm typecheck` — ran successfully
- [ ] `pnpm test` — ran successfully
- [ ] `pnpm build` — ran successfully
- [ ] `pnpm db:generate` — ran successfully
- [ ] Links and paths referenced in this document resolve

Tested by: _______________  Date: _______________
