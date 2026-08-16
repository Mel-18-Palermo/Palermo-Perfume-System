# Contributing

All work must be traceable to a GitHub issue and reviewed through a pull request. Do not push feature,
documentation, fix, or test work directly to `main`.

## Workflow

1. Read the issue and confirm its acceptance criteria. Ask for missing detail before coding.
2. Update local `main`, then create one branch for the issue:
   - `feature/<issue>-<short-name>`
   - `fix/<issue>-<short-name>`
   - `docs/<issue>-<short-name>`
   - `test/<issue>-<short-name>`
3. Make small commits with clear messages.
4. Run the repository lint, type-check, test, and build commands once the application scaffold is
   present.
5. Push the branch and open a pull request containing `Closes #<issue>`.
6. Address review feedback and wait for CI before merge.

Do not create a shared `develop` branch. `main` is the reviewed integration branch.

## Review boundaries

Prisma migrations and executable schemas, authentication and authorization, security/privacy
controls, payment handling, AI integrations, environment configuration, and CI/CD require review by
the backend/security lead. Documentation owners may design and propose these areas but should not
merge executable changes independently.

## Evidence and data safety

Use sanitized test data. Never commit `.env`, API keys, passwords, payment information, identifiable
customer data, private chat logs, or production exports. Put assessment evidence in the relevant
`docs/` directory and link it from the issue or pull request.

## Definition of done

- The linked issue acceptance criteria are satisfied.
- Automated and relevant manual tests pass.
- Documentation and `.env.example` are current.
- The pull request has a focused diff and no unrelated files.
- CI passes and review conversations are resolved.
