# Repository governance and `main` protection

Related issue: #154

## Current status

The complete setup is local on `agent/initial-project-setup`; nothing has been pushed. The remote is
private, has no default branch because it has no commits, and gives `HexCodeYT` read permission only.
The organisation owner must grant write permission before publishing and administrator permission is
required for repository rules.

The local setup includes the PHP/MySQL skeleton, ignored local secrets, an environment example,
Composer quality commands, PHPUnit, PHPStan, MySQL-backed GitHub Actions CI, contribution and security
guidance, issue forms, and a pull-request template. Continuous deployment is not configured because
issue #101 has not selected a host.

GitHub previously rejected a ruleset request for this private organisation repository on its current
plan. Keep the assessment repository private and ask the organisation owner to enable a plan that
supports protection for private repositories.

## One-time publication order

An empty GitHub repository needs a base branch before it can accept a pull request. After write
permission is granted:

1. Push only the local bootstrap commit `27f13ee` as `main`. This is the single setup exception to the
   no-direct-push rule.
2. Push `agent/initial-project-setup` without rewriting its history.
3. Open a pull request from `agent/initial-project-setup` into `main` and let CI run.
4. Ask the organisation owner to enable the rules below. Select the successful check shown as
   `PHP CI` under the `CI` workflow; GitHub may display the full name as `CI / PHP CI`.
5. Review and merge the pull request through GitHub. Do not push its commits directly to `main`.

These steps are intentionally deferred until the user asks to publish.

## Required rules

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

Under repository pull-request settings, keep squash merge enabled, disable merge commits and rebase
merge, and enable automatic deletion of merged head branches. This produces one reviewed commit on
`main` while preserving the detailed issue commits on the review branch.

## Do not enable yet

- Do not require code-owner approval until there are at least two capable reviewers.
- Do not require deployments or create deployment gates until hosting is selected.
- Do not restrict merges to a deployment environment that does not exist.

The repository is organisation-owned, so the organisation owner may additionally restrict which
users or teams can push. Pawan currently has read-only repository permission; publishing branches
requires write permission, while configuring these rules requires an administrator or organisation
owner.

## CI and deployment gate

The workflow runs Composer validation, PHP linting, PHPStan, unit tests, and MySQL integration tests
on pull requests to `main` and on the documented working-branch patterns. It has read-only repository
permissions, a 15-minute timeout, isolated test credentials, and no production secrets.

A deployment job must not be added until the host, runtime, secret store, migration process,
rollback process, health check, and environment approval are documented. Selecting a host will be a
separate reviewed change rather than an assumption in this setup issue.
