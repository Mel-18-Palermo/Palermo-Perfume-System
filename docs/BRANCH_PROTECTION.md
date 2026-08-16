# Repository governance and `main` protection

Related issue: #154

## Current status

The repository uses `main` as the reviewed integration branch. GitHub branch protection is active
and applies to administrators as well as regular contributors.

The active rule:

- requires every change to reach `main` through a pull request;
- dismisses stale reviews when a pull request changes;
- requires pull-request conversations to be resolved;
- requires linear history;
- blocks force pushes;
- blocks deletion of `main`; and
- allows zero mandatory approvals while Pawan is the only reliable technical reviewer.

Code-owner review requests remain advisory until a second capable reviewer is available. No status
check is required during the application-stack reset because the replacement CI workflow does not
exist yet.

## Contributor workflow

- Keep no more than two trusted organisation owners. Other contributors use the member role and
  receive only the repository access needed for their work.
- Each contributor works only on the assigned branch created from the current `main`.
- Contributors receive a direct browser link and commit only to their assigned branch.
- `.github/CODEOWNERS` requests `@HexCodeYT` on every pull request.
- Pawan checks issue scope, authorship, validation evidence, and review conversations before merging.
- Direct pushes, force pushes, and deletion of `main` are prohibited.

The initial contributor branches are:

- `docs/94-executive-summary`
- `requirements/105-non-functional-requirements`
- `design/114-ui-guidelines`
- `test/124-master-test-plan`
- `database/134-conceptual-architecture`

One contributor branch may contain that contributor's assigned issue work, but each issue should
still be delivered as a separate file and focused commit. A pull request must state exactly which
issue or issues it closes.

Repository pull-request settings should allow rebase merging, disable merge commits and squash
merging, and automatically delete merged head branches. Rebase merging keeps focused issue commits
visible without adding merge commits.

## CI and deployment gate

There is no active CI workflow during the stack reset. After the Next.js scaffold is added, the
replacement workflow must run linting, type-checking, automated tests, and a production build on pull
requests without production secrets. Add the successful CI job as a required status check only after
it has completed at least one pull-request run.

A deployment job must not be added until the Vercel project, Node.js runtime, secret store, Prisma
migration process, rollback process, health check, and environment approval are documented and
verified.
