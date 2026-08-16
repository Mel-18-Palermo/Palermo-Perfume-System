# Architecture baseline

The initial code uses a small front-controller structure so the team can add features without
committing to a hosting-specific framework.

The detailed folder, module, request-flow, database, and integration rules are in
[the backend architecture specification](backend-architecture.md).

## Boundaries

- `public/` is the only web-facing directory.
- `src/` contains application code under the `Palermo` namespace.
- `src/Config/` reads configuration from the environment.
- `src/Database/` owns PDO creation and safe connection defaults.
- `database/` contains reviewed migrations and non-sensitive fixtures.
- `tests/` separates fast unit checks from MySQL-backed integration checks.

Future feature modules should follow the issue scope: authentication and RBAC, customer profiles,
catalog and scent notes, quiz and recommendation, cart and orders, payments and invoices, support,
AI chat, and administration. Keep third-party providers behind application-owned interfaces so a
sandbox or vendor can be replaced without rewriting business rules.

Executable database migrations, authentication/authorization, payment handling, AI integrations,
and privacy controls are high-risk boundaries and require project-lead review.
