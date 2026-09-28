# Palermo Perfume System

Palermo is a university capstone perfume-commerce system. It is a Next.js modular monolith with a customer storefront and protected administrator surfaces. The application is designed so that prices, stock, payment outcomes, orders, permissions, and inventory changes are decided on the server rather than trusted from the browser.

## Current status

As of 29 September 2026, Palermo is at final release-candidate/presentation stage. A controlled demonstration deployment is available at [palermoperfumes.store](https://www.palermoperfumes.store/). It is not a commercial live store: it uses synthetic presentation data and Stripe test mode only.

The deployed system includes:

- public catalogue, filters, product detail, fragrance quiz and recommendations;
- customer registration/login, profile, addresses, wishlist, cart, checkout, orders, tracking, reviews, rewards/referrals, and support/concierge;
- Stripe test-mode PaymentIntent and verified-webhook handling;
- administrator catalogue, inventory/batches, orders, promotions/content, review moderation, reporting, and security surfaces.

`GET /api/health` is deliberately a process-liveness endpoint only. It does not probe the database or external providers.

## Architecture and trust boundaries

The application uses the Next.js App Router with TypeScript strict mode. Domain services live in `src/modules`; shared API contracts live in `src/contracts`; server infrastructure is in `src/lib`; and provider access is kept behind server-side integration boundaries.

- Prisma 7.10.0 accesses PostgreSQL; Supabase provides PostgreSQL and Auth.
- Checkout revalidates current server-side price, cart, promotion, address, delivery and stock state. Payment webhook processing finalises payment, order and inventory transitions transactionally.
- Customer ownership and administrator RBAC are enforced server-side. UI visibility is not authority.
- Stripe is configured for test mode. Card data remains in Stripe Elements and is not stored by Palermo.
- Production application data is in the `palermo_prod` schema. Owner-only migration authority is outside Vercel; the production runtime must not receive `DIRECT_URL`, `TEST_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or demo passwords.

## Environment model

| Environment | Application schema | Purpose |
| --- | --- | --- |
| Local/development | `palermo` (and disposable `palermo_test`) | development and integration testing |
| Vercel Preview | `palermo` | branch/PR preview with synthetic data |
| Vercel Production | `palermo_prod` | controlled presentation deployment |

Preview and Production have isolated application tables and runtime roles. Supabase Auth is project-scoped and shared between them because of the Supabase Free-plan project limit; only synthetic/demo identities and data are permitted. Production currently has all 16 repository migrations, 22 active canonical catalogue products, two intentionally archived legacy demo products, and synthetic presentation history.

## Technology

- Node.js 24.19.0; pnpm 11.24.0
- Next.js 16.3.3; React 19.2.8; TypeScript 6.0.3
- Prisma 7.10.0; PostgreSQL via Supabase
- Tailwind CSS 4.3.3; Stripe 22.6.1 / Stripe.js 9.15.0
- Vitest 4.1.11; Playwright 1.63.0; GitHub Actions and Vercel

## Local setup

```sh
nvm install
nvm use
npm install --global pnpm@11.24.0
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The home page and liveness endpoint can start without database credentials; database-backed, Auth and payment flows require approved local configuration.

Never commit `.env.local`, connection strings, provider credentials, tokens, passwords, real personal data, card data, or private production logs. `NEXT_PUBLIC_` values are browser-visible; keep privileged values server-only. [`.env.example`](.env.example) and [the database guide](prisma/README.md) describe variable purpose and target guards.

## Database and demo-data workflow

Prisma migrations in [`prisma/migrations/`](prisma/migrations/) are the schema authority. For an approved local or Preview target:

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
```

`pnpm test:db` uses only disposable `palermo_test`. `pnpm catalogue:populate` is guarded for development/Preview catalogue population. The controlled-production synthetic-history tool is owner-operated and requires explicit `palermo_prod` confirmation; see [demo-history.md](docs/development/demo-history.md). Do not run reset or migration commands against a shared target without first verifying its schema and authority. Production migrations and population are explicit owner operations, not Vercel build/runtime work.

Synthetic catalogue, customer, order and payment history exist solely for demonstration and assessment. They are not real customer, warehouse or payment-provider records.

## Validation commands

These scripts are defined in [`package.json`](package.json):

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm test:e2e
pnpm build
git diff --check
```

Targeted browser suites are `pnpm e2e:customer` and `pnpm e2e:admin`; the full E2E command prepares its disposable local database first. `pnpm auth:check` is an owner-only live Auth check and is not an ordinary CI command.

## Repository layout

```text
src/app/           App Router pages and HTTP route adapters
src/contracts/     shared typed API contracts
src/modules/       domain services and UI modules
src/integrations/  provider boundaries
src/lib/           server infrastructure and browser clients
prisma/            schema, migrations, fixtures and guarded data tools
tests/             unit, database integration and Playwright E2E tests
docs/              current guides plus requirements and delivery evidence
```

## Documentation map

- [Documentation index](docs/README.md) — current guides versus historical evidence.
- [Database guide](prisma/README.md) — schema isolation, migrations and synthetic-data tooling.
- [Implementation handbook](docs/development/implementation-handbook.md) and [frontend contracts](docs/development/frontend-contracts.md) — architecture and delivery rules.
- [Security guide](SECURITY.md), [privacy assessment](docs/privacy/dpia.md), and [testing index](docs/testing/README.md) — security, privacy, test strategy and evidence.
- [Requirements](docs/requirements/) and [SRS source](docs/srs/) — approved requirement and report material.

## Governance and limitations

`main` is protected. Normal changes use an issue, short-lived branch, pull request, review, and CI/Vercel gates; direct pushes and force pushes to protected branches are prohibited. See [CONTRIBUTING.md](CONTRIBUTING.md).

This is a controlled capstone demonstration. Stripe live mode, real customer data, commercial fulfilment/courier integration, and fully project-isolated Supabase Auth are outside its deployment scope. Service availability and third-party provider behaviour should not be inferred from the liveness endpoint alone.
