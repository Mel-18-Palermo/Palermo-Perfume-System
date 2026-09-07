# Palermo Perfume System

Palermo Perfume System is a client-facing capstone project for an intelligent online perfume selling platform.

Application implementation has begun with the foundation tracked in [#240](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/240), following the implementation-control baseline in [#238](https://github.com/Mel-18-Palermo/Palermo-Perfume-System/issues/238).

## Current phase

**Application foundation**

The scaffold provides a minimal home page and `GET /api/health`. Contracts, authentication, database access and business features are subsequent issues. The health endpoint reports application liveness only; it does not check databases or providers.

## Local setup

Use **Node.js 24.19.0** (`.nvmrc`) and **pnpm 11.24.0** (`packageManager` in `package.json`). Node version managers that support `.nvmrc` can select the pinned runtime; for example, with nvm already installed:

```sh
nvm install
nvm use
```

Install the pinned pnpm version if needed, then install dependencies from the existing lockfile:

```sh
npm install --global pnpm@11.24.0
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>. No environment variables or API keys are required for the scaffold; `.env.example` documents this. Add provider configuration only with its owning implementation issue.

Use pnpm for project dependencies and keep `pnpm-lock.yaml` as the only project lockfile. Engine checks reject an incompatible runtime or package manager. `pnpm-workspace.yaml` records the existing release-age and dependency build-script policy.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

`typecheck` generates Next.js route types before running strict TypeScript, so it works before the first build. `next-env.d.ts` and `.next/` are generated and ignored. Lint checks include unsafe TypeScript values, unhandled promises and prohibited type suppressions. The current test suite covers only the health handler; it is not evidence of completed business features.

With the development or production server running in another terminal:

```sh
curl --fail-with-body --include http://localhost:3000/api/health
```

Expected: HTTP 200, `Cache-Control: no-store`, and `{"status":"ok"}`. `pnpm start` requires a successful build; stop the development server first if using the same port.

Inter is served through `next/font/google`; an uncached development or production build needs network access to download the font. No font API key is needed.

## Implementation stack

The scaffold pins Next.js, React and strict TypeScript in `package.json`. Shared styling uses **Tailwind CSS 4**, **Inter**, and **Lucide React** icons. Canonical design values and compatible utility aliases live in `src/app/globals.css`; feature components consume these tokens instead of introducing their own palette, font or icon system.

The repository shape follows [the implementation handbook](docs/development/implementation-handbook.md): routes in `src/app`, shared UI in `src/components`, domain modules in `src/modules`, provider adapters in `src/integrations`, shared infrastructure in `src/lib`, and contracts in `src/contracts`. Empty directories mark future ownership boundaries, not implemented services.

## Planned integrations

The current implementation baseline is:

- Next.js
- React
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Stripe sandbox for payment testing

Vercel is the approved deployment platform under the implementation handbook. CI/deployment configuration belongs to #243. Authentication, AI, email and other integration details are implemented through their owning issues.

## Repository rules

`main` is the protected integration branch.

All changes must follow:

1. GitHub issue
2. Short-lived branch
3. Focused commits
4. Pull request
5. Review
6. Merge into `main`

Direct pushes to `main` are prohibited.

Force pushes to protected branches are prohibited.

There is no shared `develop` branch.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the required workflow.

## Documentation rules

Project documentation is maintained as Markdown.

Documentation: `.md`  
Diagrams: Mermaid

Mermaid source is the canonical form for system diagrams. Fixed image exports may be produced later for assessment submission or presentation purposes.

## Documentation structure

- `docs/requirements/` — Functional, non-functional, open questions, and traceability requirements
- `docs/srs/` — SRS section source material
- `docs/diagrams/` — Mermaid system diagrams
- `docs/ui/` — UI design specifications and supporting material
- `docs/security/` — Privacy and security design
- `docs/testing/` — Test strategy, cases, results, and evidence
- `docs/project-management/` — Meetings, supervisor feedback, planning, and contribution evidence

## Requirements baseline

The supplied Palermo project specification currently contains:

- 91 explicitly listed functional requirement entries due to a duplicated source requirement number;
- 33 non-functional requirement categories;
- four named modules that require additional requirements clarification.

Canonical requirement IDs are maintained in:

- `docs/requirements/functional-requirements.md`
- `docs/requirements/non-functional-requirements.md`
- `docs/requirements/open-questions.md`

These files are the requirements source of truth for the new project baseline.

## Implementation status

The application foundation is implemented. Domain functionality, Prisma schema/migrations, provider integrations, CI and deployments remain separate work. SRS sources below `docs/` retain their requirements and planning context; their planned checks are not test-pass claims.
