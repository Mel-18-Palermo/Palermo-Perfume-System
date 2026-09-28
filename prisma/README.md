# Database operations

Prisma 7.10.0 and PostgreSQL provide Palermo's server-side persistence. [`schema.prisma`](schema.prisma) and the committed [`migrations/`](migrations/) are the schema authority; do not treat Supabase CLI history as evidence that Prisma migrations have been applied.

## Schemas and isolation

| Target | Schema | Use |
| --- | --- | --- |
| Local/development and Vercel Preview | `palermo` | non-production application data |
| Database integration tests | `palermo_test` | disposable, local/CI only |
| Vercel Production controlled demo | `palermo_prod` | isolated synthetic presentation data |

`databaseConfiguration` accepts only these schemas and requires verified TLS for remote connections. Preview and Production use separate application roles and tables. Supabase Auth remains project-scoped/shared between Preview and Production as a documented Free-plan limitation; it is not equivalent to full project-level isolation.

The Vercel Production runtime receives only its least-privilege application connection. It must not receive `DIRECT_URL`, `TEST_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or demo passwords. Owner-only migration authority runs outside Vercel.

## Configuration

Copy [`.env.example`](../.env.example) to ignored `.env.local` and provide only approved values. The relevant database variables are:

- `DATABASE_URL` — runtime connection for the selected application schema.
- `DIRECT_URL` — direct/session connection for owner-operated migrations and guarded tools; never a Vercel Production runtime value.
- `TEST_DATABASE_URL` — disposable `palermo_test` connection for database/E2E tooling only.
- `PALERMO_DATABASE_ENV` — must be `development` or `preview` for seed/test tooling.
- `DATABASE_CA_FILE` — public Supabase CA path for verified remote TLS.

`assertDevelopmentDatabase` refuses seed/catalogue/test tooling when the environment is missing, not development/preview, or Vercel Production. A configuration marker does not prove a target is correct: verify the URL schema, host, role and intended environment before an owner-operated write.

## Commands

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm test:db
```

`db:migrate` runs `prisma migrate deploy` against `DIRECT_URL`; it does not reset data. `test:db` is limited to `palermo_test`, applies all committed migrations from a clean disposable schema, and is intentionally separate from `pnpm test`. Never use `prisma migrate reset` against a shared environment.

## Catalogue and presentation data

`pnpm catalogue:populate` validates and upserts the approved catalogue and active quiz into an explicitly guarded development/Preview target. `pnpm demo:reset` owns its deterministic local/demo fixture. Neither command is a Production deployment step.

The owner-operated `pnpm demo:populate-history` tool adds deterministic synthetic history to `palermo_prod` only when its explicit target, confirmation, project-reference, host/user, TLS and non-Vercel safeguards pass. It is idempotent and does not run during startup, build, migrations, CI, seeding or reset. See [`docs/development/demo-history.md`](../docs/development/demo-history.md).

Production contains 16 applied repository migrations, 22 active canonical catalogue products, two intentionally archived legacy demo products, and synthetic presentation history. Opening inventory and all fixture/history values are demonstration data, not warehouse, customer, or provider records.

## Data boundaries

The schema supports identity/profile, catalogue, cart/checkout/orders/payment, inventory/delivery, recommendations, reviews, loyalty/referrals, promotions/content, support, and administrator/RBAC data. Application services enforce ownership, state transitions and transaction semantics; database constraints supplement rather than replace those boundaries.

No passwords, raw card data, Supabase service keys, or provider-private payloads belong in application tables. Keep connection values and private logs out of commits and evidence.
