# Palermo Perfume System

Palermo Perfume System is a capstone e-commerce application for fragrance discovery and purchasing.
The project covers customer accounts and scent profiles, an interactive fragrance quiz, catalogue
search and note filtering, cart and checkout, sandbox payments and invoices, AI-assisted support,
administration, privacy and security controls, testing, and assessment documentation.

The repository is currently being reset to the technology stack recorded in the Interim SRS. It is
not a finished product or production deployment. Feature behaviour must be implemented through the
linked issues and reviewed pull requests.

## Approved stack

- Next.js with React and TypeScript
- Node.js runtime
- Prisma ORM
- Supabase Postgres
- Vercel hosting
- GitHub Actions for continuous integration

The database schema, authentication provider, payment sandbox, AI provider configuration, and
deployment automation will be introduced through separate reviewed changes.

## Current status

The obsolete application foundation has been removed. The next implementation task is to add a
minimal Next.js and TypeScript scaffold, followed by Prisma configuration and a reviewed Supabase
schema.

There are no valid installation or development commands until that scaffold is committed. Do not
add ad hoc setup steps to `main` in the meantime.

## Planned configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application origin |
| `DATABASE_URL` | Pooled Supabase Postgres connection used by the application |
| `DIRECT_URL` | Direct Supabase Postgres connection used for Prisma migrations |
| `OPENAI_API_KEY` | Server-only AI integration credential when approved |
| `PAYMENT_PROVIDER` | Approved payment sandbox identifier |
| `PAYMENT_SANDBOX_API_KEY` | Server-only payment sandbox credential |

Copy `.env.example` to the local environment file selected by the application scaffold. Never
commit populated credentials or expose server-only variables to browser code.

## Project structure

```text
docs/
  architecture/         Technical decisions and diagrams
  deployment/           Hosting and release decisions
  diagrams/             DFD, ERD, domain, and UI-flow sources or exports
  project-management/   Sprints, meetings, feedback, and contribution evidence
  requirements/         Requirements, use cases, and traceability
  security/             Privacy and application-security specifications
  testing/              Test plans, cases, UAT, defects, and results
.github/                 Issue forms, ownership rules, and pull-request template
```

The application directories will be documented after the scaffold exists. See
[the architecture baseline](docs/architecture/README.md) and
[issue responsibility map](docs/TEAM_RESPONSIBILITIES.md).

## Team workflow

`main` is the reviewed integration branch. Each change starts with an issue and uses a short-lived
`feature/`, `fix/`, `docs/`, `test/`, or `chore/` branch. Pull requests must link the issue, explain
validation, pass the available checks, and resolve review comments. There is no shared `develop`
branch.

Detailed instructions are in [CONTRIBUTING.md](CONTRIBUTING.md). Security reporting and development
expectations are in [SECURITY.md](SECURITY.md). Repository governance is documented in
[the branch-protection checklist](docs/BRANCH_PROTECTION.md).

## Deployment status

Vercel is the selected application host and Supabase is the selected managed database platform.
Continuous deployment is not configured during the stack reset. Deployment configuration must wait
for the application scaffold, environment ownership, migration procedure, health check, and rollback
procedure to be reviewed.
