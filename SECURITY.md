# Security Policy

## Current phase

The Palermo Perfume System is currently in the Software Requirements Specification (SRS) phase.

Security controls documented during this phase describe intended requirements and design decisions. They must not be presented as implemented or verified until the application exists and the relevant controls have been tested.

## Reporting a security issue

Do not disclose vulnerabilities, credentials, personal information, payment information, session data, or other sensitive material in a public GitHub issue.

Report suspected security issues to the project lead through the team's approved private communication channel. Include only the minimum information required to reproduce and assess the issue.

## Repository security rules

Never commit:

- `.env` files or populated environment configuration;
- API keys or access tokens;
- database connection strings or passwords;
- payment credentials or card data;
- private keys or certificates;
- real customer personal information;
- session identifiers;
- production database exports;
- private application logs containing sensitive data.

Synthetic data must be used for development, testing, demonstrations, screenshots, and assessment evidence.

## Application security baseline

When implementation begins, the project must apply security controls appropriate to the approved SRS, including:

- server-side authentication and authorisation;
- least-privilege role-based access control;
- server-side input validation;
- safe output handling;
- protected session management;
- parameterised database access through Prisma;
- controlled use of raw database queries;
- secure secret storage;
- transport encryption;
- safe payment-provider integration;
- privacy-conscious AI integration;
- security-relevant logging without sensitive payloads;
- dependency and automated security checks where practical.

Security controls must be linked to approved requirements and validated through the project test plan.

## High-risk changes

The following areas require review by the backend/security lead before integration:

- authentication and authorisation;
- Prisma schema and migrations;
- Supabase configuration;
- server-side business logic;
- payment processing;
- AI integrations;
- environment and secret configuration;
- security and privacy controls;
- CI/CD and deployment configuration.

## Security documentation

Detailed security and privacy documentation will be created under `docs/security/` as the SRS is developed.

No security control should be claimed as implemented merely because it appears in requirements or design documentation.
