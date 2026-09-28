# Security policy

Palermo is a controlled capstone demonstration, not a commercial production service. Report suspected vulnerabilities privately to the project lead through the approved team channel; do not place credentials, exploit details, personal data, payment data, sessions, or sensitive logs in a public issue.

## Current implementation boundaries

The deployed application enforces customer ownership and administrator RBAC server-side, validates untrusted input at server boundaries, and uses Prisma/PostgreSQL transactions for protected commerce and inventory state. Supabase Auth handles provider authentication; Palermo stores application session hashes, not passwords. Stripe is test-mode only, and raw card details remain inside Stripe Elements.

The browser is not authoritative for price, stock, payment success, order state, permissions, or inventory. Production uses the isolated `palermo_prod` application schema; owner-only migration credentials and `DIRECT_URL`, `TEST_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and demo passwords are excluded from the Vercel Production runtime.

These controls reduce defined risks; they are not a claim of comprehensive commercial security certification. `GET /api/health` is process-liveness only and is not a dependency or security health probe.

## Repository and data rules

Never commit:

- populated `.env` files, API keys, access tokens, passwords, connection strings, private keys, or session identifiers;
- payment credentials, raw card data, production database exports, or private logs containing sensitive values;
- real customer or payment data.

Use synthetic data for development, testing, demonstrations, screenshots, and assessment evidence. Keep `NEXT_PUBLIC_` configuration safe for browser exposure. Do not print secrets in command output, CI logs, issues, pull requests, or evidence.

## Review-sensitive changes

Backend/security-owner review is required for authentication/authorisation, Prisma schema or migrations, Supabase configuration, payment processing, server-side business rules, AI integrations, environment/secrets, security/privacy controls, and CI/CD or deployment configuration.

## Supporting material

- [`docs/security/`](docs/security/) — supporting security evidence, including dated regression reports.
- [`docs/privacy/dpia.md`](docs/privacy/dpia.md) — privacy assessment and linked retention/risk records.
- [`docs/testing/`](docs/testing/) — plans, regression maps and QA evidence.

Follow the protected-branch pull-request process in [CONTRIBUTING.md](CONTRIBUTING.md) for any remediation.
