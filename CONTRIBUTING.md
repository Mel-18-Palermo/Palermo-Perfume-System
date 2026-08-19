# Contributing

All Palermo project work must be traceable through GitHub.

## Core workflow

Every normal change follows:

**1 issue → 1 branch → focused commits → 1 pull request → review → merge**

Do not push directly to `main`.

Do not create a shared `develop` branch.

## Starting work

1. Read the assigned GitHub issue.
2. Confirm its scope, dependencies, and acceptance criteria.
3. Update local `main`.
4. Create a short-lived branch from the current `main`.

Branch naming:

- `feat/<issue>-<short-name>`
- `fix/<issue>-<short-name>`
- `docs/<issue>-<short-name>`
- `test/<issue>-<short-name>`
- `chore/<issue>-<short-name>`

Example:

`docs/162-auth-requirements`

## Commits

Keep commits small and understandable.

Preferred commit format:

- `docs: define authentication requirements`
- `feat: add product catalogue page`
- `fix: prevent duplicate checkout submission`
- `test: add cart total cases`
- `chore: configure repository tooling`

Do not combine unrelated work in one commit or pull request.

## Pull requests

Every pull request must:

- link its GitHub issue;
- describe what changed;
- identify relevant requirement IDs;
- explain how the work was validated;
- contain only work within the assigned scope;
- resolve review conversations before merge.

Use `Closes #<issue-number>` when the pull request fully satisfies the issue.

## Documentation

Canonical documentation is Markdown.

Canonical system diagrams use Mermaid.

Do not submit undocumented diagrams as the only editable source.

## Protected technical areas

Changes involving the following require review by the backend/security lead:

- Prisma schema and migrations;
- Supabase/database configuration;
- authentication and authorization;
- payment processing;
- server-side business logic;
- AI integrations;
- secrets or environment configuration;
- security and privacy controls;
- CI/CD and deployment configuration.

Frontend contributors should not modify these areas unless their assigned issue explicitly requires it.

## Security and data safety

Never commit:

- `.env` files;
- API keys;
- passwords;
- database credentials;
- payment credentials or card data;
- real customer data;
- session tokens;
- private production logs.

Use synthetic data for development and assessment evidence.

## Definition of done

Work is complete only when:

- issue acceptance criteria are satisfied;
- the change stays within issue scope;
- relevant documentation is updated;
- required validation or tests pass;
- no secrets or sensitive data are included;
- review comments are resolved;
- the pull request is approved for integration.
