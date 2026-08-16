# Deployment baseline

Vercel is the selected application host. Supabase provides the managed Postgres database, and Prisma
owns application data access and migrations.

No deployment workflow is active during the stack reset. Before continuous deployment is enabled,
record the Vercel project ownership, Node.js runtime, preview and production environments, secret
management, Supabase connection strategy, Prisma migration procedure, rollback procedure, health
check, backup ownership, and release approval process.

Deployment automation must release only reviewed commits from `main`. Production credentials must
stay in the platform secret stores and must never be committed to this repository.
