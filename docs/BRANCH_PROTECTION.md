# Repository governance and `main` protection

Related issue: #154

## Current status

The private remote now uses `main`, beginning with Pawan's bootstrap commit `27f13ee`. The complete
setup is published from `agent/initial-project-setup` for pull-request review. `HexCodeYT` is an
organisation owner and repository administrator.

The earlier unrelated root commit was preserved locally before the one-time recovery of `main`. Its
author will resubmit the document from a branch based on the corrected history. No project content
was silently attributed to another person.

The local setup includes the PHP/MySQL skeleton, ignored local secrets, an environment example,
Composer quality commands, PHPUnit, PHPStan, MySQL-backed GitHub Actions CI, contribution and security
guidance, issue forms, and a pull-request template. Continuous deployment is not configured because
issue #101 has not selected a host.

GitHub rejects both rulesets and classic branch protection for this private organisation repository
on its current plan. The team has chosen to keep the repository private and use assigned branches,
pull requests, CI, code-owner review requests, and restricted roles as process controls. These
controls reduce mistakes but cannot technically prevent a member with write access from pushing to
an unprotected `main`.

## Team workflow on the current plan

- Keep no more than two trusted organisation owners. Other contributors use the member role and
  receive only the repository access needed for their work.
- Pawan creates one issue branch and draft pull request before a contributor starts.
- Contributors receive a direct browser link to their branch and commit only to that branch.
- Branch names use `docs/<issue>-<topic>`, `design/<issue>-<topic>`,
  `requirements/<issue>-<topic>`, `test/<issue>-<topic>`, or another documented prefix.
- `.github/CODEOWNERS` requests `@HexCodeYT` on every pull request. This request is advisory without
  an enforceable branch rule.
- Pawan checks issue scope, authorship, CI, and review conversations before merging.
- Direct pushes, force pushes, and deletion of `main` are prohibited by team policy.

Repository pull-request settings should allow rebase merging, disable merge commits and squash
merging, and automatically delete merged head branches. Rebase merging keeps the focused issue
commits visible without adding merge commits.

## Rules to enable if plan support changes

- Create an active branch ruleset named `Protect main` targeting the default branch (`main`).
- Leave the bypass list empty.
- Require changes to be made through a pull request before merging.
- Start with zero mandatory approvals if Pawan is the only technical reviewer; increase to one once a
  second reliable reviewer can approve Pawan's own pull requests.
- Require the `PHP CI` status check from the `CI` workflow to pass.
- Require the branch to be up to date before merge after the first successful CI run.
- Require all pull-request conversations to be resolved.
- Enable deletion restriction and non-fast-forward update restriction to block branch deletion and
  force pushes.
- Do not allow direct-push bypasses once the initial repository setup is merged.

## Do not enable yet

- Do not require code-owner approval until there are at least two capable reviewers.
- Do not require deployments or create deployment gates until hosting is selected.
- Do not restrict merges to a deployment environment that does not exist.

Do not describe `main` as protected while GitHub rejects the rule. Assigned branches are a practical
workflow for this team, not a substitute for server-side enforcement.

## CI and deployment gate

The workflow runs Composer validation, PHP linting, PHPStan, unit tests, and MySQL integration tests
on pull requests to `main` and on the documented working-branch patterns. It has read-only repository
permissions, a 15-minute timeout, isolated test credentials, and no production secrets.

A deployment job must not be added until the host, runtime, secret store, migration process,
rollback process, health check, and environment approval are documented. Selecting a host will be a
separate reviewed change rather than an assumption in this setup issue.
