# Deployment decision pending

No deployment workflow has been added because the hosting target is not yet known.

Before adding continuous deployment, record the chosen hosting model, PHP and MySQL versions,
secret-management mechanism, TLS termination, migration procedure, rollback procedure, backup
ownership, and whether the provider supports zero-downtime releases. The resulting workflow must
deploy only reviewed commits from `main` and must never store credentials in the repository.
