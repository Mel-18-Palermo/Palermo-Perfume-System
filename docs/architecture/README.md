# Architecture baseline

The application will use a modular Next.js structure with React and TypeScript. Server-side code
runs on Node.js, Prisma owns database access, Supabase provides managed Postgres, and Vercel hosts
the application.

The detailed module, request-flow, database, and integration rules are in
[the backend architecture specification](backend-architecture.md).

The payment and AI boundaries are in
[the external integrations specification](external-integrations.md).

## Planned boundaries

- `src/app/` owns routes, layouts, pages, route handlers, and server actions.
- `src/components/` contains reusable interface components.
- `src/lib/` contains server-only application, domain, data-access, and integration modules.
- `prisma/` contains the reviewed schema, migrations, and synthetic seed logic.
- `tests/` separates unit, integration, and browser-level checks.

Feature modules follow the issue scope: authentication and RBAC, customer profiles, catalogue and
scent notes, quiz and recommendation, cart and orders, payments and invoices, support, AI chat, and
administration. Keep external providers behind application-owned interfaces so a sandbox or vendor
can be replaced without rewriting business rules.

Executable Prisma migrations, authentication and authorization, payment handling, AI integrations,
and privacy controls are high-risk boundaries and require project-lead review.
