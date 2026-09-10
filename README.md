# Palermo Perfume System

Palermo Perfume System is a server-authoritative perfume commerce platform built as a Next.js modular monolith. It combines catalogue discovery, customer identity, cart and checkout workflows, inventory reservations, Stripe test-mode payments, order history, and administrator boundaries over Prisma and Supabase PostgreSQL.

Canonical requirements and decisions live under [`docs/requirements/`](docs/requirements/). GitHub issues and pull requests record implementation ownership, acceptance evidence, and current delivery status.

## Current status

The project is in **Sprint 2 — Mid Integration**. The repository has progressed beyond the original application scaffold.

Current `main` includes server-side boundaries and tests for:

- Supabase-backed customer and administrator identity, sessions, ownership checks, and RBAC;
- public catalogue summary/detail reads with inventory-backed availability;
- customer profile, saved addresses, cart, and wishlist persistence;
- deterministic quiz/recommendation foundations;
- checkout revalidation, idempotent order creation, and bounded inventory reservations;
- inventory balances, movements, reservations, and finished-product batch recording/release;
- real Stripe test-mode PaymentIntent and verified webhook adapters;
- payment, order, inventory, and invoice finalisation in authoritative database transactions;
- customer-owned order history, order detail, invoice reads, and cancellation requests;
- administrator shell, catalogue presentation baseline, and server catalogue mutation authority;
- protected CI, database integration checks, governance checks, and Vercel deployments.

Some feature acceptance and presentation integration work remains open. In particular, real Stripe service evidence still depends on approved test-mode credentials, and incomplete GitHub issues remain the authority for outstanding scope. Passing builds or previews alone does not mark an issue complete.

`GET /api/health` reports application-process liveness only. It deliberately does not probe the database or external providers.

## Technology

- Next.js 16 and React 19
- strict TypeScript 6
- Tailwind CSS 4
- Prisma 7 with PostgreSQL
- Supabase PostgreSQL and Supabase Auth
- Stripe test-mode server SDK and Stripe.js browser boundary
- Vitest unit, contract, and PostgreSQL integration tests
- GitHub Actions and Vercel

The browser is never authoritative for price, stock, payment success, order status, administrator permission, or other protected business outcomes. Shared DTOs live in `src/contracts`, domain services in `src/modules`, server infrastructure in `src/lib`, and provider SDK access behind trusted server boundaries.

## Local setup

Use **Node.js 24.19.0** from [`.nvmrc`](.nvmrc) and **pnpm 11.24.0** from [`package.json`](package.json).

```sh
nvm install
nvm use
npm install --global pnpm@11.24.0
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>.

The home page and health endpoint can start without service credentials. Database-backed APIs, authentication, and payment operations require their corresponding local configuration. Copy the documented names before adding approved development values:

```sh
cp .env.example .env.local
```

Never commit `.env.local`, connection URLs, provider credentials, tokens, or real customer data. [`.env.example`](.env.example) explains each variable and its permitted environment.

Important configuration groups are:

- `DATABASE_URL` for trusted application access to the private `palermo` schema;
- `DIRECT_URL` for Prisma migration authority;
- `TEST_DATABASE_URL` for the disposable `palermo_test` schema;
- `PALERMO_DATABASE_ENV=development` or `preview` for guarded seed/test operations;
- Supabase server connection variables for authentication;
- Stripe test-mode server secrets and the browser-safe publishable key.

Missing Stripe server configuration fails closed. The deterministic sandbox gateway is an explicitly injected test double and cannot silently become deployed payment authority. PAN, expiry, and CVC remain inside Stripe-controlled Elements and must never enter Palermo state, APIs, storage, or logs.

## Database workflow

Prisma migrations under [`prisma/migrations/`](prisma/migrations/) are the schema authority. Supabase CLI migration history is not evidence that Prisma migrations were applied.

```sh
pnpm db:generate
pnpm exec prisma migrate status
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm test:db
```

Before migration or seed commands, verify that `DIRECT_URL`/`DATABASE_URL` point only to the approved isolated development or preview project. `pnpm test:db` additionally requires a guarded `palermo_test` target. Never run `prisma migrate reset` against a shared database, and never expose connection details in command output or evidence.

The production build does not apply migrations or seed data. Database deployment remains an explicit owner operation.

## Validation

Run the repository checks relevant to every code change:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm build
git diff --check
```

`pnpm typecheck` generates Prisma and Next.js route types before strict TypeScript validation. `pnpm test` runs unit and contract tests; `pnpm test:db` applies every repository migration to the isolated test schema before running persistence, transaction, concurrency, and integration cases.

If the local host cannot run the default Turbopack production builder, validate the same application through Next.js's production Webpack builder and document the environment-only fallback:

```sh
pnpm db:generate
pnpm exec next build --webpack
```

With the development or production server running in another terminal:

```sh
curl --fail-with-body --include http://localhost:3000/api/health
```

Expected: HTTP 200, `Cache-Control: no-store`, and `{"status":"ok"}`.

## Application boundaries

The App Router exposes typed HTTP adapters for:

- authentication and session operations;
- catalogue summary/detail reads;
- profile and address mutations;
- cart and wishlist reads/mutations;
- recommendation/quiz operations;
- checkout and delivery-method operations;
- payment initiation and verified webhooks;
- order, invoice, and cancellation-request operations;
- authorised administrator catalogue and inventory operations.

React components must use the approved API/client boundary rather than calling Prisma, Supabase database APIs, Stripe, or other providers directly. See [`docs/development/frontend-contracts.md`](docs/development/frontend-contracts.md) and the [`implementation handbook`](docs/development/implementation-handbook.md).

## Repository workflow and governance

`main` is the protected integration branch. Normal work follows:

1. one assigned GitHub issue;
2. one short-lived branch from current `main`;
3. small focused commits;
4. one scoped pull request with validation evidence;
5. required governance and technical checks;
6. merge into `main` only when the complete issue acceptance criteria are satisfied.

Direct pushes to `main` and force pushes to protected branches are prohibited. There is no shared `develop` branch.

Contributor-authored pull requests are read-only to automated implementation agents unless the repository owner explicitly authorises a specific action on that specific PR. Dependency status, passing CI, Vercel success, and requested-reviewer state do not grant merge authority.

The governance check applies these rules:

- a `HexCodeYT`-authored PR does not require external approval;
- another contributor's current PR head requires an `APPROVED` review from `HexCodeYT`;
- a new commit or force-pushed head invalidates approval for the older head;
- technical CI and Vercel checks remain independent requirements.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, protected areas, evidence expectations, and the definition of done.

## Documentation structure

- `docs/requirements/` — canonical functional/non-functional requirements, decisions, and traceability
- `docs/srs/` — SRS source material
- `docs/development/` — implementation, ownership, API, and frontend contracts
- `docs/diagrams/` — canonical Mermaid system diagrams
- `docs/ui/` — presentation and responsive design specifications
- `docs/privacy/` and `docs/security/` — privacy and security material
- `docs/testing/` — test strategy, cases, results, and evidence
- `docs/project-management/` — delivery planning and contribution evidence

Markdown is canonical for project documentation, and Mermaid source is canonical for system diagrams.
