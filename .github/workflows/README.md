# CI and deployment operations

Issue #243 implements decisions D-083, D-092 and D-095 and Handbook §18.

## GitHub quality gate

`ci.yml` runs on every pull request and push to `main`, including documentation
changes so a required check cannot remain pending because of path filters.
`Quality checks` installs the lockfile, lints, checks types, runs unit/contract
tests and builds production output without hosted service credentials.
`Database integration` applies migrations and seeds to an ephemeral PostgreSQL
17.6 service using a restricted role and runs the database integrity suite.
The service disappears with the runner. It never connects to Supabase.

Require **CI gate** from the GitHub Actions app in `main` branch protection,
with the branch up to date before merging. The aggregate fails when either job
fails, is cancelled or is skipped. Keep linear history, administrator enforcement
and conversation resolution enabled. The sole owner's reviewer count is zero.
No workflow receives deployment tokens or write permissions; actions are pinned
to reviewed commit SHAs. Node comes from `.nvmrc`, pnpm from `packageManager`.

To exercise rejection, open a temporary PR containing an intentional lint/type
failure, record its failed check and blocked merge state, then close it and delete
the temporary branch. Never merge the failure fixture or disable protection for it.
Record both failed and successful run URLs in the implementation PR.

## Vercel project settings (technical owner only)

The configured project is `pawan-sedaras-projects/palermo-perfume-system`, linked
to this GitHub repository with `main` as its Production branch. The team has only
the technical owner, and the project starts with no service environment variables.
The settings below describe the configuration to preserve when adding integrations.

Import `Mel-18-Palermo/Palermo-Perfume-System` through Vercel's GitHub integration.
Use the repository root, Next.js preset, Node **24.x**, and `main` as the Production
branch. `vercel.json` enables automatic Git deployments on all branches and uses
the locked pnpm install and Prisma-aware production build. Vercel manages Node
patch updates; `.nvmrc` pins the patch used for local/CI checks.

Feature/PR pushes must produce Preview deployments; merges into protected `main`
produce Production deployments. Connect the GitHub integration with access to this
repository only. Keep Vercel project/team configuration, environment management,
manual deployment, rollback and domain permissions with the technical owner.
Contributors use GitHub to trigger previews and do not receive Vercel tokens or
ordinary project administration access. Verify team roles in the linked account.

The current health/home scaffold builds and runs without service credentials.
Start Preview with no database, Supabase, payment, AI or email secrets. As services
are integrated, assign **Preview-only** values from a disposable project with
synthetic data and set `PALERMO_DATABASE_ENV=preview`. Use test payment credentials
and safe/mock email/AI providers. Assign separately controlled Production values;
never inherit or copy Production secrets into Preview. Deploy only the restricted
runtime `DATABASE_URL`, not `DIRECT_URL`, `TEST_DATABASE_URL` or database-owner
credentials. Migrations and seeding are explicit owner operations, never build
hooks. See `.env.example` and `prisma/README.md` for database configuration.

After linking, verify an automatic Preview deployment of the issue branch, check
`/api/health` returns HTTP 200 with `{"status":"ok"}`, and attach its URL to the
PR. Require the actual Vercel Preview status context alongside **CI gate** once it
has been observed. Check deployment environment scopes and team permissions in
Vercel before marking #243 complete. Source configuration alone does not prove
that a project is linked, roles are restricted or a Preview has succeeded.

Do not print environment values, tokens, connection URLs or customer data in
CI/deployment diagnostics. Safe evidence consists of check names/results, run
URLs, deployment URLs and redacted configuration descriptions.

References: [Vercel Git integration](https://vercel.com/docs/git/vercel-for-github),
[Git configuration](https://vercel.com/docs/project-configuration/git-configuration),
[supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
