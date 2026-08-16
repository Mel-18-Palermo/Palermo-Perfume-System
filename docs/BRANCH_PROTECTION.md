# `main` branch protection

Apply a branch ruleset to `main` after the bootstrap commit exists and the CI workflow has run at
least once. As of 16 August 2026, GitHub reports that rulesets are unavailable for this private
organisation repository on its current plan. Keep the assessment repository private and ask the
organisation owner to enable a plan that supports protection for private repositories.

## Required rules

- Require changes to be made through a pull request.
- Start with zero mandatory approvals if Pawan is the only technical reviewer; increase to one once a
  second reliable reviewer can approve Pawan's own pull requests.
- Require the status check `CI / PHP CI` to pass.
- Require the branch to be up to date before merge after the first successful CI run.
- Require all pull-request conversations to be resolved.
- Block force pushes.
- Block branch deletion.
- Do not allow direct-push bypasses once the initial repository setup is merged.

## Do not enable yet

- Do not require code-owner approval until there are at least two capable reviewers.
- Do not require deployments or create deployment gates until hosting is selected.
- Do not restrict merges to a deployment environment that does not exist.

The repository is organisation-owned, so the organisation owner may additionally restrict which
users or teams can push. Pawan currently has read-only repository permission; publishing branches
requires write permission, while configuring these rules requires an administrator or organisation
owner.
