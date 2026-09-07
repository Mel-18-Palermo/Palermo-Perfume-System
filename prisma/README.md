# Database foundation (#242)

Prisma 7.10 and PostgreSQL implement the milestone persistence baseline. The schema follows the SRS data dictionary and #241 transport concepts; database entities remain server-side and are not API DTOs.

## Connection and isolation

Supply `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`, `PALERMO_DATABASE_ENV` and `DATABASE_CA_FILE` through local `.env.local` or the deployment environment. `.env.example` lists their meanings. The local loader never prints values; pre-existing process variables take precedence. Never commit URLs containing passwords, Supabase service keys or local CLI state.

- `DATABASE_URL`: application pooler connection, `schema=palermo`.
- `DIRECT_URL`: session pooler (5432) or reachable direct PostgreSQL connection for migrations and seeding, `schema=palermo`.
- `TEST_DATABASE_URL`: isolated session connection, `schema=palermo_test`.
- `PALERMO_DATABASE_ENV`: `development` or `preview` permits seed/test commands. Production is refused, including `VERCEL_ENV=production`.
- `DATABASE_CA_FILE`: the public Supabase CA path, normally `prisma/certs/supabase-ca.crt`.

Remote URLs require `sslmode=verify-full`. The pg adapter explicitly enables certificate/hostname verification and removes conflicting TLS URL options. The migration configuration passes the CA to Prisma's schema engine with strict certificate acceptance. Local PostgreSQL on loopback can use unencrypted development connections.

The public CA was downloaded over HTTPS from [Supabase's certificate distribution](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). It is Supabase Root 2021 CA, expiring 26 April 2031. It is not a secret. See [Supabase SSL documentation](https://supabase.com/docs/guides/platform/ssl-enforcement) for certificate rotation and verification.

The current supplied development project uses a dedicated `palermo_dev` login, owning only the pre-provisioned private `palermo` and `palermo_test` schemas. It has no superuser, bypass-RLS, role-creation or database-creation privilege. Those schemas grant no usage to public/browser roles and must not be added to PostgREST's exposed schemas. Application authorization remains server-side; a database owner is not a substitute for account ownership/RBAC checks.

Provision schemas/ownership using an administrative connection before applying migrations. The migration role deliberately does not create arbitrary schemas. A different deployment needs its own isolated project and credentials. Preview must never inherit the production database URL. The development environment marker is an operator guard, not automatic proof that a URL belongs to the correct project; verify target identity during deployment configuration.

## Commands

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm test:db
```

`db:migrate` applies committed migrations with `prisma migrate deploy`; it does not use a shadow database or reset data. Generate new migrations as reviewable SQL before applying them. `prisma.config.ts` reads the session URL; never use a transaction-pooler URL for migration workflows.

`test:db` clears tables/functions/enums only inside the explicitly configured `palermo_test` schema, applies both migrations from clean state, seeds, and checks real constraints. That schema is disposable and must contain no user data. Database integration tests are deliberately excluded from ordinary `pnpm test`, so unit tests/builds do not require cloud credentials. CI can provide a local PostgreSQL service with pre-created schemas and a dedicated user.

`pnpm typecheck` and `pnpm build` generate the client first. Generated files are ignored. Application code imports `getDatabase` from `src/lib/db/index.ts`, whose `server-only` boundary blocks client imports. Construction is lazy, allowing the home/health scaffold to build without credentials. Seed/test tooling uses the internal connection factory directly.

## Schema inventory

| Area | Models |
|---|---|
| Customer/profile | Customer, Address, FragranceProfile, ProfileFavouriteNote, FragranceIdentity |
| Admin/RBAC minimum | AdminAccount, AdminRole, Permission, RolePermission |
| Catalogue | FragranceFamily, FragranceNote, Intensity, Perfume, PerfumeImage, PerfumeNote, PerfumeVariant, Collection, CollectionPerfume, SuitabilityTag, PerfumeSuitability |
| Cart/checkout/order | Cart, CartItem, Promotion, DeliveryMethod, Order, OrderItem, Payment, Invoice |
| Inventory/delivery | InventoryBalance, InventoryReservation, InventoryMovement, ProductionBatch, Shipment, TrackingEvent |
| Quiz/recommendation | Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizResponse, RecommendationRun, RecommendationItem |

Prices use integer minor units plus currency; promotion percentages use integer basis points. This is an implementation refinement of the logical decimal model and matches #241's unambiguous transport. Currency values in synthetic data are AUD, not a new tax/GST policy. Controlled intensity/family/note/suitability records support later taxonomy refinement.

Provider account links are optional opaque UUIDs; no passwords, sessions, verification tokens, raw card details or provider-private payloads are stored here. Authentication lifecycle implementation remains #244. Participation, full promotion management, support, audit/backup workflows and unrelated derived modules are not implemented in this issue.

## Integrity decisions

The first migration creates model tables, enums, foreign keys and ordinary unique indexes. The second records SQL checks/indexes/triggers that Prisma cannot fully express:

- canonical lower-case unique email, verified active-account and deactivation metadata;
- one current address per type, one profile/identity and one active customer cart;
- exactly one visitor/customer cart owner, positive quantities and non-negative prices;
- immutable order/item/invoice snapshots, matched order totals and JSON address snapshots;
- checkout idempotency key unique per customer, one payment/invoice/shipment per order;
- invoice creation only after matching verified successful payment;
- non-negative on-hand/reserved stock with reservations not exceeding balance;
- unique order/variant reservations, append-only movements and unique movement references;
- at most one release movement per batch with a composite FK to its actual variant;
- consistent release/delivery confirmation metadata;
- quiz answers linked to both their actual question and quiz, unique ranked recommendation items.

The database foundation does not itself implement durable checkout replay, payment callback ordering, reservation aggregate maintenance, batch-release transactions, account ownership or recommendation scoring. Those services must use atomic transactions and independently validate their inputs. Row constraints supplement those services; they are not claims that the later business issues are complete.

## Seed behavior

`seed-data.ts` uses fixed UUIDs, a fixed September 2026 fixture clock and synthetic `.test` identities. It inserts missing rows in one transaction and preserves existing rows, including inventory, history and subsequent user edits. Repeated seeding does not reset the demo or re-apply movements. Fixed historical reservation timestamps are test fixtures; a live demo/reset clock belongs to #271.

Seeded examples include two customers, an administrative identity/permission, two perfume variants, profile/address/preferences, visitor/customer carts, a paid and a pending order, a paid invoice, inventory movements/reservation, an unreleased finished batch, pending tracking and a completed quiz with deterministic fallback recommendation. Auth-provider users are not provisioned, so the seeded identities are not yet usable login accounts. No AI, Stripe or email call is made.

Requirements: D-003–D-007, D-014–D-017, D-034–D-047, D-057–D-072, D-096, D-111 and the #242 issue scope. Validation evidence belongs in the integration PR; these design notes do not claim future service tests passed.
